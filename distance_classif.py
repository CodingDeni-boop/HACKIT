import torch
from transformers import CLIPModel, CLIPProcessor
import numpy as np
import os
import pandas as pd
import requests
from PIL import Image
import io
import json

# Check APIFY_TOKEN
APIFY_TOKEN = os.environ.get("APIFY_TOKEN")
if not APIFY_TOKEN:
    # Try to read from config file
    if os.path.exists("apify_token.txt"):
        with open("apify_token.txt", "r") as f:
            APIFY_TOKEN = f.read().strip()
            os.environ["APIFY_TOKEN"] = APIFY_TOKEN
            print("✓ Token loaded from apify_token.txt")
    else:
        print("❌ APIFY_TOKEN not set!")
        print("Either:")
        print("  1. Set it in PowerShell: $env:APIFY_TOKEN=\"your_token\"")
        print("  2. Create apify_token.txt with your token")
        exit(1)

INPUT_FILE = "./data/input/input.jpg"
COMPARISON_FOLDER = "./data/compare"
QUERY = "black jeans"
QUANTITY = 10
RESULTS_FOLDER = "./toFrontend/results"

# Create folders if they don't exist
os.makedirs(COMPARISON_FOLDER, exist_ok=True)
os.makedirs(RESULTS_FOLDER, exist_ok=True)
os.makedirs(os.path.dirname(INPUT_FILE), exist_ok=True)

# Clean up old images from comparison folder
print("🧹 Cleaning comparison folder...")
for f in os.listdir(COMPARISON_FOLDER):
    file_path = os.path.join(COMPARISON_FOLDER, f)
    try:
        if os.path.isfile(file_path):
            os.remove(file_path)
    except Exception as e:
        print(f"⚠ Could not delete {f}: {e}")

# Clean up old results
print("🧹 Cleaning results folder...")
for f in os.listdir(RESULTS_FOLDER):
    file_path = os.path.join(RESULTS_FOLDER, f)
    try:
        if os.path.isfile(file_path):
            os.remove(file_path)
    except Exception as e:
        print(f"⚠ Could not delete {f}: {e}")

# Fetch images from Vinted to populate comparison folder
print("📥 Fetching images from Vinted...")

listings = []
try:
    from marketplace_scraper import scrape_all, fetch_thumb, parse_generic

    # Search for QUERY on Vinted - fetch QUANTITY images
    listings = scrape_all(QUERY, per_site=QUANTITY, sites=["Vinted"])
    
    # Download images to comparison folder
    for idx, listing in enumerate(listings):
        if listing.image_url:
            try:
                response = requests.get(listing.image_url, timeout=10)
                if response.status_code == 200:
                    filename = os.path.join(COMPARISON_FOLDER, f"vinted_{idx:03d}.jpg")
                    with open(filename, 'wb') as f:
                        f.write(response.content)
                    print(f"✓ Downloaded: {listing.title[:40]} - {listing.price} {listing.currency}")
            except Exception as e:
                print(f"✗ Failed to download: {e}")
except Exception as e:
    print(f"⚠ Could not fetch from Vinted: {e}")
    print("  Make sure APIFY_TOKEN is set and marketplace_scraper.py is available")

# If no images were downloaded, create a dummy test image
if len(os.listdir(COMPARISON_FOLDER)) == 0:
    print("⚠ No images found. Creating test images...")
    for i in range(3):
        img = Image.new('RGB', (100, 100), color=(73 + i*30, 109 + i*30, 137 + i*30))
        img.save(os.path.join(COMPARISON_FOLDER, f"test_{i}.jpg"))

print(f"\n✓ Found {len(os.listdir(COMPARISON_FOLDER))} images in comparison folder")

# Load embedding model
print("🤖 Loading FashionCLIP model...")
_fclip = CLIPModel.from_pretrained("patrickjohncyh/fashion-clip")
_proc  = CLIPProcessor.from_pretrained("patrickjohncyh/fashion-clip")
_fclip.eval()

def embed_images(paths, batch_size=32):
    results = []
    for i in range(0, len(paths), batch_size):
        batch = [Image.open(p).convert("RGB") for p in paths[i:i+batch_size]]
        inputs = _proc(images=batch, return_tensors="pt", padding=True)
        with torch.no_grad():
            feats = _fclip.get_image_features(**inputs)
        results.append(feats.cpu().numpy())
    return np.concatenate(results, axis=0)

# Create or use input image
if not os.path.exists(INPUT_FILE):
    print(f"⚠ Input file {INPUT_FILE} not found. Creating test image...")
    img = Image.new('RGB', (100, 100), color=(100, 120, 140))
    os.makedirs(os.path.dirname(INPUT_FILE), exist_ok=True)
    img.save(INPUT_FILE)

print(f"🔍 Processing: {INPUT_FILE}")
target_emb = embed_images([INPUT_FILE])[0]

VALID_EXT = {".jpg", ".jpeg", ".png", ".webp", ".bmp"}

compare_path_list = [
    os.path.join(COMPARISON_FOLDER, f)
    for f in os.listdir(COMPARISON_FOLDER)
    if os.path.splitext(f.lower())[1] in VALID_EXT
]

print(f"📊 Comparing against {len(compare_path_list)} images...")
compare_emb = embed_images(compare_path_list, batch_size=32)

# Normalize embeddings
target_emb /= np.linalg.norm(target_emb)
compare_emb /= np.linalg.norm(compare_emb, axis=1, keepdims=True)

# Cosine similarity
scores = compare_emb @ target_emb

# Get top 5 results
top_k = 5
top_indices = np.argsort(scores)[-top_k:][::-1]

print(f"\n🏆 Top {top_k} Similar Results:")
for i, abs_index in enumerate(top_indices):
    similarity = scores[abs_index]
    image_path = compare_path_list[abs_index]
    print(f"  {i+1}. {os.path.basename(image_path)} - Similarity: {similarity:.2%}")
    
    # Save result
    result_path = os.path.join(RESULTS_FOLDER, f"{i}.png")
    Image.open(image_path).save(result_path)

print(f"\n✅ Results saved to {RESULTS_FOLDER}")

# Write results.json so the Node server can return it to the frontend
results_out = []
for i, abs_index in enumerate(top_indices):
    basename = os.path.basename(compare_path_list[abs_index])
    listing = None
    try:
        idx = int(basename.split("_")[1].split(".")[0])
        listing = listings[idx] if idx < len(listings) else None
    except (IndexError, ValueError):
        pass

    results_out.append({
        "id": i + 1,
        "title": listing.title if listing else basename,
        "price": listing.price if listing else 0.0,
        "currency": listing.currency if listing else "",
        "source": listing.site if listing else "Vinted",
        "sim": round(float(scores[abs_index]), 4),
        "swatch": "#1a2030",
        "desc": "Second-hand",
        "url": listing.url if listing else "",
        "secondHand": True,
        "image": f"/results/{i}.png",
    })

results_json_path = os.path.join(os.path.dirname(RESULTS_FOLDER), "results.json")
with open(results_json_path, "w", encoding="utf-8") as f:
    json.dump(results_out, f, indent=2)
print(f"✅ results.json written → {results_json_path}")

