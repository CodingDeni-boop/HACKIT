from fastembed import ImageEmbedding
import numpy as np
import os
import pandas as pd
import requests
from PIL import Image
import io

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

INPUT_FILE = "./data/input/jeans.webp"
COMPARISON_FOLDER = "./data/compare"
QUERY = "black jeans"
QUANTITY = 500
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

try:
    from marketplace_scraper import scrape_all, fetch_thumb, parse_generic
    
    # Search for QUERY on Vinted - fetch QUANTITY images
    listings = scrape_all(QUERY, per_site=200, sites=["Vinted"])
    
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
print("🤖 Loading CLIP model...")
model = ImageEmbedding(model_name="Qdrant/clip-ViT-B-32-vision")

# Create or use input image
if not os.path.exists(INPUT_FILE):
    print(f"⚠ Input file {INPUT_FILE} not found. Creating test image...")
    img = Image.new('RGB', (100, 100), color=(100, 120, 140))
    os.makedirs(os.path.dirname(INPUT_FILE), exist_ok=True)
    img.save(INPUT_FILE)

print(f"🔍 Processing: {INPUT_FILE}")
target_emb = np.array(list(model.embed([INPUT_FILE])))[0]

VALID_EXT = {".jpg", ".jpeg", ".png", ".webp", ".bmp"}

compare_path_list = [
    os.path.join(COMPARISON_FOLDER, f)
    for f in os.listdir(COMPARISON_FOLDER)
    if os.path.splitext(f.lower())[1] in VALID_EXT
]

print(f"📊 Comparing against {len(compare_path_list)} images...")
compare_emb = np.array(list(model.embed(compare_path_list, batch_size=128)))

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

