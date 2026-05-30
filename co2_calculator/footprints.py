"""
CO2 and water footprint lookup tables derived from life-cycle assessment research.
Sources: Quantis/ADEME textile LCA studies, WRAP Valuing Our Clothes report.
All values are averages across brands/origins — display as estimates.
"""

ITEM_FOOTPRINTS = {
    "t_shirt":       {"co2_kg": 6.0,  "water_l": 2700},
    "jeans":         {"co2_kg": 33.4, "water_l": 7000},
    "dress":         {"co2_kg": 22.0, "water_l": 5000},
    "jacket":        {"co2_kg": 28.0, "water_l": 4000},
    "sweater":       {"co2_kg": 15.0, "water_l": 3500},
    "coat":          {"co2_kg": 40.0, "water_l": 9000},
    "trousers":      {"co2_kg": 18.0, "water_l": 4000},
    "shirt":         {"co2_kg": 8.5,  "water_l": 2700},
    "skirt":         {"co2_kg": 10.0, "water_l": 2200},
    "shoes":         {"co2_kg": 14.0, "water_l": 8000},
    "underwear_set": {"co2_kg": 3.0,  "water_l": 1000},
    "sportswear":    {"co2_kg": 12.0, "water_l": 3000},
    "hoodie":        {"co2_kg": 18.0, "water_l": 4000},
    "shorts":        {"co2_kg": 8.0,  "water_l": 2000},
    "leggings":      {"co2_kg": 10.0, "water_l": 2500},
    "suit":          {"co2_kg": 45.0, "water_l": 10000},
    "blouse":        {"co2_kg": 7.0,  "water_l": 2200},
    "cardigan":      {"co2_kg": 14.0, "water_l": 3200},
    "jumpsuit":      {"co2_kg": 20.0, "water_l": 4500},
    "swimwear":      {"co2_kg": 8.0,  "water_l": 2000},
}

MATERIAL_MULTIPLIERS = {
    "cotton":          1.0,
    "organic_cotton":  0.8,
    "polyester":       1.4,
    "wool":            2.1,
    "linen":           0.6,
    "silk":            2.5,
    "nylon":           1.6,
    "synthetic":       1.4,
    "blend":           1.1,
    "denim":           1.0,
    "leather":         3.0,
    "fleece":          1.3,
    "cashmere":        2.8,
    "viscose":         1.2,
    "rayon":           1.2,
    "acrylic":         1.5,
    "spandex":         1.4,
    "lyocell":         0.7,
    "tencel":          0.7,
}

# Secondhand adds ~0.6 kg CO2 for transport/cleaning (WRAP estimate)
SECONDHAND_CO2_KG = 0.6
# Secondhand production water is ~0.01% of new — essentially zero compared to production
SECONDHAND_WATER_FRACTION = 0.0001

# Equivalents for human-readable output
KG_CO2_PER_KM_CAR = 0.21   # average EU car: 0.21 kg CO2/km
LITRES_PER_SHOWER = 65       # average 8-minute shower
