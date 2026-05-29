from wallapy import check_wallapop

results = check_wallapop(
    product_name="giacca di jeans",   # <-- il primo argomento è product_name, non keywords
    max_price=40,
    max_total_items=20,
    deep_search=False,                # più veloce: per le immagini non serve
)

item = results[0]
print(item["title"], item["price"], item["currency"])
print(item["link"])              # link all'annuncio
print(item["main_image"])        # URL della foto principale
print(item["all_images"])        # tutte le foto