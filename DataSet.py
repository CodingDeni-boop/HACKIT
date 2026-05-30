# add this import at the top of your file
from wallapy import WallaPyClient
import asyncio

# warm up session before scraping
async def warmup():
    client = WallaPyClient()
    await client.check_wallapop(product_name="shoes", max_total_items=5)


asyncio.run(warmup())

"""
import json
import time
from wallapy.request_handler import safe_request
from wallapy.config import LATITUDE, LONGITUDE

BASE_URL = "https://api.wallapop.com/api/v3/general/search"

def scrape_category(keyword: str, max_items: int = 500) -> list:
    all_items = []
    seen_ids  = set()
    cursor    = None
    page      = 1

    while len(all_items) < max_items:
        params = {
            "keywords":  keyword,
            "order_by":  "newest",
            "source":    "search_box",
        }
        if cursor:
            params["start_cursor"] = cursor

        # use safe_request — it adds random user agent + location automatically
        response = safe_request(
            url=BASE_URL,
            params=params,
            latitude=LATITUDE,
            longitude=LONGITUDE,
        )

        if response is None or response.status_code != 200:
            print(f"  Failed on page {page}, status: {getattr(response, 'status_code', 'None')}")
            break

        try:
            data = response.json()
        except Exception as e:
            print(f"  JSON parse error: {e}")
            break

        items = (
            data.get("data", {})
                .get("section", {})
                .get("payload", {})
                .get("items", [])
        )

        if not items:
            print(f"  No more items after page {page}")
            break

        for item in items:
            item_id = item.get("id")
            if item_id and item_id not in seen_ids:
                seen_ids.add(item_id)
                all_items.append({
                    "id":          item_id,
                    "title":       item.get("title"),
                    "description": item.get("description"),
                    "price":       item.get("price", {}).get("amount"),
                    "currency":    item.get("price", {}).get("currency"),
                    "link":        f"https://es.wallapop.com/item/{item.get('web_slug', '')}",
                    "main_image":  (item.get("images") or [{}])[0].get("medium"),
                    "all_images":  [img.get("medium") for img in item.get("images", [])],
                    "brand":       item.get("brand"),
                    "size":        item.get("size"),
                    "condition":   item.get("condition"),
                    "location":    item.get("location", {}).get("city"),
                    "category":    keyword,
                })

        print(f"  Page {page} — {len(all_items)} items so far")

        cursor = data.get("meta", {}).get("next_page")
        if not cursor:
            print(f"  End of results for '{keyword}'")
            break

        page += 1
        time.sleep(0.5)

    return all_items


CATEGORIES = [
    "jacket", "dress", "jeans", "coat",
    "shirt", "shoe", "boot", "bag",
    "sweater", "skirt", "trousers", "sneaker",
]

def build_dataset(max_per_category: int = 500):
    full_dataset = []
    seen_ids     = set()

    for category in CATEGORIES:
        print(f"\nScraping: {category}")
        items = scrape_category(category, max_items=max_per_category)

        for item in items:
            if item["id"] not in seen_ids:
                seen_ids.add(item["id"])
                full_dataset.append(item)

        print(f"  Total unique so far: {len(full_dataset)}")
        time.sleep(2)

    print(f"\nDone — {len(full_dataset)} unique items")

    with open("wallapop_dataset.json", "w", encoding="utf-8") as f:
        json.dump(full_dataset, f, indent=2, ensure_ascii=False)
    print("Saved to wallapop_dataset.json")

if __name__ == "__main__":
    build_dataset(max_per_category=500)

    """