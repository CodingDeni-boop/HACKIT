# amazon_scraper.py

import os
import requests

def scrape_amazon(query, limit=10):
    url = "https://amazon-product-data-api.p.rapidapi.com/search"

    headers = {
        "X-RapidAPI-Key": os.environ["RAPIDAPI_KEY"],
        "X-RapidAPI-Host": "amazon-product-data-api.p.rapidapi.com"
    }

    params = {
        "query": query,
        "page": 1,
    }

    response = requests.get(url, headers=headers, params=params)
    data = response.json()

    listings = []

    for item in data.get("results", [])[:limit]:
        listings.append(type("Listing", (), {
            "title": item.get("title"),
            "price": item.get("price", 0),
            "currency": "USD",
            "image_url": item.get("image"),
            "url": item.get("url"),
            "site": "Amazon"
        }))

    return listings