from fastembed import ImageEmbedding
import numpy as np
import os
import pandas as pd
from marketplace_scraper import search


INPUT_FILE = "./data/input/jeans.webp"
COMPARISON_FOLDER = "./data/compare"
QUERY = "jeans"

results = search(
    query=QUERY,
    per_site=100,
    sites=["Vinted"],
    save_images_to_disk=True,
    render_to=None,   # set to None to skip the chart
)

model = ImageEmbedding(model_name="Qdrant/clip-ViT-B-32-vision")

target_emb = np.array(list(model.embed([INPUT_FILE])))[0]

VALID_EXT = {".jpg", ".jpeg", ".png", ".webp", ".bmp"}

compare_path_list = [
    os.path.join(COMPARISON_FOLDER, f)
    for f in os.listdir(COMPARISON_FOLDER)
    if os.path.splitext(f.lower())[1] in VALID_EXT
]

compare_emb = np.array(list(model.embed(compare_path_list, batch_size=128)))

# normalize
target_emb /= np.linalg.norm(target_emb)
compare_emb /= np.linalg.norm(compare_emb, axis=1, keepdims=True)

# cosine similarity
scores = compare_emb @ target_emb

from PIL import Image

top_k = 5
top_indices = np.argsort(scores)
print(top_indices)

for i, abs_index in enumerate(top_indices):
    print(compare_path_list[abs_index], scores[abs_index])
    Image.open(compare_path_list[abs_index]).save(f"./toFrontend/results/{i}.png")

