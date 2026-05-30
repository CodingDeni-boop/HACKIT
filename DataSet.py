from wallapy import check_wallapop
from torch.utils.data.dataset import Dataset

NAME = "shoe"
SIZE = 10

results = check_wallapop(
    product_name=NAME,
    max_total_items=SIZE
)

print(results)
"""
print(item["title"], item["price"], item["currency"])
print(item["link"])              # link all'annuncio
print(item["main_image"])        # URL della foto principale
print(item["all_images"])        # tutte le foto
"""
class ClassDataset():
    pass

for item in results:
    print(item["main_image"])