"""
Multi-marketplace keyword scraper -> comparison image.

Searches Depop, Poshmark, Mercari, Vinted, and eBay for a keyword (e.g.
"t-shirt") via Apify actors, then renders a single comparison image:
a price-by-marketplace chart plus a grid of sample listings with thumbnails.

------------------------------------------------------------------------------
SETUP
------------------------------------------------------------------------------
pip install apify-client requests pillow matplotlib

Get a free Apify token at https://console.apify.com/account/integrations
Export it:  export APIFY_TOKEN="apify_api_xxx"

------------------------------------------------------------------------------
USAGE
------------------------------------------------------------------------------
python marketplace_scraper.py "vintage nike t-shirt" --per-site 12
# -> writes comparison.png

Notes:
- Apify actor IDs change over time. The ACTORS map below uses popular public
  actors as of 2026; if one stops working, search the Apify Store for a
  replacement and swap the ID + tweak parse_<site>() for its output schema.
- Each actor returns slightly different field names, so every marketplace has
  its own small parser that normalizes results into a common Listing shape.
"""

import argparse
import io
import os
import sys
from dataclasses import dataclass
from concurrent.futures import ThreadPoolExecutor, as_completed

import requests
from apify_client import ApifyClient

QUERY = "vintage nike t-shirt"
PER_SITE = 12
OUT_FILE = "comparison.png"
SITES = ["Vinted"]
APIFY_TOKEN = "apify_api_3SAfpraJNLwR3QA62i3NaE7mlVycOF0t2uxU"  # or None if using env
token = APIFY_TOKEN

# --- normalized record every parser produces -------------------------------

@dataclass
class Listing:
    site: str
    title: str
    price: float          # normalized to a float; currency ignored for charting
    currency: str
    url: str
    image_url: str | None


# --- Apify actor IDs per marketplace ---------------------------------------
# (actor_id, input_builder, parser)

def _vinted_input(q, n):
    # automation-lab/vinted-scraper schema: keyword search
    return {"searchQuery": q, "maxItems": n}

def _depop_input(q, n):
    return {"searchQueries": [q], "maxItems": n}

def _poshmark_input(q, n):
    return {"searchQueries": [q], "maxItems": n}

def _mercari_input(q, n):
    return {"searchQueries": [q], "maxItems": n}

def _ebay_input(q, n):
    return {"searchQueries": [q], "maxItems": n}

def _etsy_input(q, n):
    # automation-lab/etsy-scraper schema: keyword search
    # slower settings to avoid Etsy's 429 rate limiting
    return {"searchQuery": q, "maxItems": n,
            "requestDelay": 2500, "maxConcurrency": 2}


def _num(v):
    """Best-effort price -> float."""
    if v is None:
        return None
    if isinstance(v, (int, float)):
        return float(v)
    s = str(v).replace(",", ".")
    digits = "".join(c for c in s if (c.isdigit() or c == "."))
    try:
        return float(digits) if digits else None
    except ValueError:
        return None


def _g(d, *keys):
    """Return first present key from a dict (handles nested 'price.amount')."""
    for k in keys:
        if "." in k:
            cur = d
            ok = True
            for part in k.split("."):
                if isinstance(cur, dict) and part in cur:
                    cur = cur[part]
                else:
                    ok = False
                    break
            if ok and cur not in (None, ""):
                return cur
        elif d.get(k) not in (None, ""):
            return d[k]
    return None


def parse_generic(site, items):
    """Tolerant parser that works across most fashion-marketplace actors."""
    out = []
    for it in items:
        price = _num(_g(it, "price", "price.amount", "priceAmount",
                        "current_price", "listingPrice"))
        if price is None:
            continue
        out.append(Listing(
            site=site,
            title=str(_g(it, "title", "name", "itemName", "description") or "")[:60],
            price=price,
            currency=str(_g(it, "currency", "price.currency", "currencyCode") or ""),
            url=str(_g(it, "url", "itemUrl", "link", "permalink") or ""),
            image_url=_g(it, "image", "imageUrl", "thumbnail", "photo",
                         "image_url", "images.0.url", "photos.0.url"),
        ))
    return out


ACTORS = {
    # site:      (actor_id,                        input_builder)
    # Vinted: pay-per-result, no special permissions — the reliable starting point.
    "Vinted":   ("automation-lab/vinted-scraper",    _vinted_input),
    # The rest are less reliable: eBay actor may need renting, Mercari/Vinted-full
    # actors may demand account permissions (don't approve those), Depop hits
    # Cloudflare intermittently, Poshmark's free actor ignores keyword search.
    "Depop":    ("h4sh/depop-scraper",               _depop_input),
    "Poshmark": ("h4sh/poshmark-scraper",            _poshmark_input),
    "Mercari":  ("h4sh/mercari-scraper",             _mercari_input),
    "eBay":     ("dtrungtin/ebay-items-scraper",     _ebay_input),
    # Etsy: same author as the working Vinted actor, clean searchQuery schema.
    "Etsy":     ("automation-lab/etsy-scraper",       _etsy_input),
}

# Which sites to actually run. Start with Vinted only; add more once each works.
DEFAULT_SITES = ["Vinted"]


def scrape_site(client, site, query, per_site):
    actor_id, build_input = ACTORS[site]
    try:
        run = client.actor(actor_id).call(
            run_input=build_input(query, per_site),
        )
        dataset_id = run["defaultDatasetId"] if isinstance(run, dict) else run.default_dataset_id
        items = list(client.dataset(dataset_id).iterate_items())
        listings = parse_generic(site, items)[:per_site]
        print(f"  {site:9s} -> {len(listings)} listings")
        return listings
    except Exception as e:
        print(f"  {site:9s} -> FAILED ({e})", file=sys.stderr)
        return []


def scrape_all(query, per_site, sites):
    token = os.environ.get("APIFY_TOKEN")
    if not token:
        sys.exit("Set APIFY_TOKEN env var (https://console.apify.com/account/integrations)")
    client = ApifyClient(token)

    print(f"Searching '{query}' across {len(sites)} marketplace(s): {', '.join(sites)}")
    results = []
    with ThreadPoolExecutor(max_workers=len(sites)) as ex:
        futs = {ex.submit(scrape_site, client, s, query, per_site): s for s in sites}
        for f in as_completed(futs):
            results.extend(f.result())
    return results


# --- image rendering --------------------------------------------------------

def fetch_thumb(url, size=(140, 140)):
    from PIL import Image
    try:
        r = requests.get(url, timeout=10)
        img = Image.open(io.BytesIO(r.content)).convert("RGB")
        img.thumbnail(size)
        return img
    except Exception:
        return None


def save_images(query, listings, base_dir="images"):
    """Download every listing image into images/<site>/ folders,
    and write a prices.csv mapping image filename -> price."""
    import re
    import csv

    safe_query = re.sub(r"[^\w\-]+", "_", query).strip("_")
    root = os.path.join(base_dir, safe_query)
    saved = 0
    rows = []  # (site, image_file, price, currency, url)

    for l in listings:
        if not l.image_url:
            continue
        site_dir = os.path.join(root, l.site)
        os.makedirs(site_dir, exist_ok=True)

        # filename: <site>_<index>_<price>.jpg, with a sanitized title snippet
        snippet = re.sub(r"[^\w\-]+", "_", l.title)[:30].strip("_") or "item"
        # count existing files to keep a stable index per site
        idx = len([f for f in os.listdir(site_dir) if f.endswith(".jpg")])
        fname = f"{l.site}_{idx:03d}_{int(l.price)}_{snippet}.jpg"
        path = os.path.join(site_dir, fname)

        try:
            r = requests.get(l.image_url, timeout=10)
            r.raise_for_status()
            with open(path, "wb") as f:
                f.write(r.content)
            saved += 1
            rows.append((l.site, fname, l.price, l.currency, l.url))
        except Exception as e:
            print(f"  skip {l.site} image ({e})", file=sys.stderr)

    # write prices.csv at the query root
    csv_path = os.path.join(root, "prices.csv")
    with open(csv_path, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["site", "image_file", "price", "currency", "url"])
        w.writerows(rows)

    # per-site summary
    print(f"\nSaved {saved} images under '{root}/':")
    for s in ACTORS:
        site_dir = os.path.join(root, s)
        if os.path.isdir(site_dir):
            n = len([f for f in os.listdir(site_dir) if f.endswith(".jpg")])
            print(f"  {s:9s} -> {n} images")
    print(f"Wrote price index -> {csv_path}")
    return root


def render_image(query, listings, out_path):
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    from matplotlib.offsetbox import OffsetImage, AnnotationBbox
    import numpy as np

    if not listings:
        sys.exit("No listings collected — nothing to render.")

    sites = list(ACTORS.keys())
    colors = dict(zip(sites, ["#179d8c", "#ff2300", "#5b21b6", "#e11d48", "#0064d2", "#f1641e"]))

    fig = plt.figure(figsize=(14, 11), facecolor="white")
    fig.suptitle(f'"{query}"  —  marketplace comparison',
                 fontsize=20, fontweight="bold", y=0.97)

    # ---- top: price distribution by marketplace (box + scatter) ----
    ax1 = fig.add_axes([0.08, 0.62, 0.84, 0.28])
    data, labels, xs = [], [], []
    for i, s in enumerate(sites):
        prices = [l.price for l in listings if l.site == s]
        if not prices:
            continue
        data.append(prices)
        labels.append(f"{s}\n(n={len(prices)})")
        jitter = np.random.normal(len(data), 0.06, len(prices))
        ax1.scatter(jitter, prices, color=colors[s], alpha=0.5, s=22, zorder=3)
    bp = ax1.boxplot(data, showfliers=False, widths=0.5, patch_artist=True)
    for patch, s in zip(bp["boxes"], [s for s in sites if any(l.site == s for l in listings)]):
        patch.set_facecolor(colors[s]); patch.set_alpha(0.18)
    ax1.set_xticks(range(1, len(labels) + 1))
    ax1.set_xticklabels(labels, fontsize=9)
    ax1.set_ylabel("Price", fontsize=11)
    ax1.set_title("Price distribution", fontsize=13, loc="left", pad=8)
    ax1.grid(axis="y", alpha=0.25)
    for spine in ("top", "right"):
        ax1.spines[spine].set_visible(False)

    # ---- summary line under chart ----
    summary = "   ".join(
        f"{s}: median {np.median([l.price for l in listings if l.site==s]):.0f}"
        for s in sites if any(l.site == s for l in listings)
    )
    fig.text(0.08, 0.585, summary, fontsize=10, color="#444")

    # ---- bottom: sample listings grid with thumbnails ----
    ncols = 6
    per_site_show = 1  # cheapest per site for the headline grid
    sample = []
    for s in sites:
        site_listings = sorted([l for l in listings if l.site == s], key=lambda l: l.price)
        sample.extend(site_listings[:max(1, ncols // len(sites))])
    sample = sorted(sample, key=lambda l: l.price)[:ncols * 2]

    grid_top = 0.50
    cell_w, cell_h = 1 / ncols, 0.20
    ax2 = fig.add_axes([0.04, 0.04, 0.92, grid_top])
    ax2.axis("off")
    ax2.set_title("Cheapest matches", fontsize=13, loc="left")

    for idx, l in enumerate(sample):
        row, col = divmod(idx, ncols)
        cx = (col + 0.5) * cell_w
        cy = 1 - (row + 0.5) * cell_h - 0.05
        thumb = fetch_thumb(l.image_url) if l.image_url else None
        if thumb is not None:
            ab = AnnotationBbox(OffsetImage(np.asarray(thumb), zoom=0.55),
                                (cx, cy + 0.04), frameon=True,
                                bboxprops=dict(edgecolor=colors[l.site], lw=2))
            ax2.add_artist(ab)
        ax2.text(cx, cy - 0.055, f"{l.price:.0f} {l.currency}".strip(),
                 ha="center", fontsize=10, fontweight="bold")
        ax2.text(cx, cy - 0.085, l.site, ha="center", fontsize=8,
                 color=colors[l.site], fontweight="bold")
        ax2.text(cx, cy - 0.11, l.title[:22], ha="center", fontsize=6.5, color="#666")

    fig.savefig(out_path, dpi=130, bbox_inches="tight")
    print(f"\nSaved -> {out_path}")


def search(query, per_site=12, sites=None, save_images_to_disk=True,
           render_to=None, base_dir="images"):
    """Run the full marketplace search pipeline and return the results.

    This is the main library entry point. Import and call it from your own code.

    Parameters
    ----------
    query : str
        Search keyword, e.g. "vintage nike t-shirt".
    per_site : int
        Max listings to pull per marketplace (default 12).
    sites : list[str] | None
        Which marketplaces to scrape, e.g. ["Vinted", "Etsy"].
        Defaults to DEFAULT_SITES (Vinted only). Must be keys of ACTORS.
    save_images_to_disk : bool
        If True, download every listing image into base_dir/<query>/<site>/
        and write a prices.csv. (default True)
    render_to : str | None
        If set to a path (e.g. "comparison.png"), also render the comparison
        image to that path. If None, no chart is produced. (default None)
    base_dir : str
        Root folder for saved images. (default "images")

    Returns
    -------
    list[Listing]
        Normalized listings (site, title, price, currency, url, image_url).
        Also accessible as dicts via [l.__dict__ for l in results].

    Raises
    ------
    SystemExit
        If APIFY_TOKEN is not set in the environment.
    """
    if sites is None:
        sites = DEFAULT_SITES
    unknown = [s for s in sites if s not in ACTORS]
    if unknown:
        raise ValueError(f"Unknown site(s): {unknown}. Valid: {list(ACTORS)}")

    listings = scrape_all(query, per_site, sites)
    if save_images_to_disk:
        save_images(query, listings, base_dir=base_dir)
    if render_to:
        render_image(query, listings, render_to)
    return listings


def _cli():
    ap = argparse.ArgumentParser()
    ap.add_argument("query", help="search keyword, e.g. 't-shirt'")
    ap.add_argument("--per-site", type=int, default=12, help="listings per marketplace")
    ap.add_argument("--out", default="comparison.png")
    ap.add_argument("--sites", nargs="+", default=DEFAULT_SITES,
                    choices=list(ACTORS.keys()),
                    help="which marketplaces to scrape (default: Vinted)")
    ap.add_argument("--no-save-images", action="store_true",
                    help="skip downloading listing images into per-site folders")
    args = ap.parse_args()

    search(
        query=args.query,
        per_site=args.per_site,
        sites=args.sites,
        save_images_to_disk=not args.no_save_images,
        render_to=args.out,
    )


if __name__ == "__main__":
    _cli()
