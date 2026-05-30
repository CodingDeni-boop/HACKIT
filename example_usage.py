"""
Example: using marketplace_scraper as a library (not from the terminal).

Make sure both files are in the same folder, and that APIFY_TOKEN is set:
    export APIFY_TOKEN="your_token"

Then run:  python example_usage.py
"""

from marketplace_scraper import search

# --- Example 1: simplest possible call ------------------------------------
# Scrape Vinted (the default) for a keyword, save images + prices.csv.
results = search("vintage nike t-shirt")

print(f"\nGot {len(results)} listings")
for l in results[:5]:
    print(f"  [{l.site}] {l.price} {l.currency} - {l.title}")


# --- Example 2: multiple sites, more results, and a chart -----------------
results = search(
    query="levis 501 jeans",
    per_site=100,
    sites=["Vinted", "Etsy"],
    save_images_to_disk=True,
    render_to="jeans_comparison.png",   # set to None to skip the chart
)


# --- Example 3: work with the data directly (no files) --------------------
# Skip image downloads and chart; just get the data to process yourself.
results = search(
    query="carhartt jacket",
    per_site=50,
    sites=["Vinted"],
    save_images_to_disk=False,
    render_to=None,
)

# Each result is a Listing dataclass; access fields directly:
prices = [l.price for l in results]
if prices:
    print(f"\nCarhartt jackets on Vinted:")
    print(f"  cheapest: {min(prices):.2f}")
    print(f"  average:  {sum(prices) / len(prices):.2f}")
    print(f"  dearest:  {max(prices):.2f}")

# Or convert to plain dicts (e.g. to dump to JSON / load into pandas):
import json
as_dicts = [l.__dict__ for l in results]
print(json.dumps(as_dicts[:2], indent=2))

# With pandas, if installed:
# import pandas as pd
# df = pd.DataFrame(as_dicts)
# print(df.groupby("site")["price"].describe())
