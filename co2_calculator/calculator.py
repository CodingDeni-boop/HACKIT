"""
CO2 and water impact calculator for secondhand vs. new clothing purchases.
Material composition is not used — category-level averages only.
"""
from .footprints import (
    ITEM_FOOTPRINTS,
    SECONDHAND_CO2_KG,
    SECONDHAND_WATER_FRACTION,
    KG_CO2_PER_KM_CAR,
    LITRES_PER_SHOWER,
)
from .classifier import classify


def calculate_impact(title: str, caption: str = "") -> dict:
    """
    Given a listing title (and optional BLIP caption), return the CO2/water
    impact of buying this item secondhand vs. new.

    Returns:
        category, new_item_co2_kg, new_item_water_l,
        secondhand_co2_kg, saved_co2_kg, saved_water_l,
        equivalents: {km_not_driven, showers_saved}
    """
    combined = f"{title} {caption}".strip()
    category = classify(combined)["category"]

    base = ITEM_FOOTPRINTS.get(category, ITEM_FOOTPRINTS["t_shirt"])
    new_co2   = base["co2_kg"]
    new_water = base["water_l"]

    secondhand_co2   = SECONDHAND_CO2_KG
    secondhand_water = new_water * SECONDHAND_WATER_FRACTION

    saved_co2   = round(max(new_co2 - secondhand_co2, 0.0), 1)
    saved_water = round(max(new_water - secondhand_water, 0.0))

    return {
        "category":          category,
        "new_item_co2_kg":   round(new_co2, 1),
        "new_item_water_l":  round(new_water),
        "secondhand_co2_kg": secondhand_co2,
        "saved_co2_kg":      saved_co2,
        "saved_water_l":     saved_water,
        "equivalents": {
            "km_not_driven": round(saved_co2 / KG_CO2_PER_KM_CAR),
            "showers_saved": round(saved_water / LITRES_PER_SHOWER),
        },
    }
