"""
Keyword-based category and material classifier for clothing listing titles/captions.
No LLM calls — works offline and is fast enough to run on every result.
"""
import re
from .footprints import ITEM_FOOTPRINTS, MATERIAL_MULTIPLIERS

# Maps keywords (lowercase) -> footprint category key
_CATEGORY_RULES = [
    # most specific first to avoid false matches
    (r"\b(swim(suit|wear|ming)|bikini|bathing suit)\b",      "swimwear"),
    (r"\b(jumpsuit|overall|dungaree|romper)\b",              "jumpsuit"),
    (r"\b(legging|yoga pant|tight)\b",                       "leggings"),
    (r"\b(short(s)?)\b",                                     "shorts"),
    (r"\b(hoodie|hoody|sweatshirt)\b",                       "hoodie"),
    (r"\b(jeans?|denim pant|denim trouser)\b",               "jeans"),
    (r"\b(coat|parka|trench|overcoat|peacoat)\b",            "coat"),
    (r"\b(jacket|blazer|windbreaker|bomber|anorak)\b",       "jacket"),
    (r"\b(suit|tuxedo|blazer set)\b",                        "suit"),
    (r"\b(dress|gown|sundress|midi|maxi dress|mini dress)\b","dress"),
    (r"\b(skirt|mini skirt|maxi skirt)\b",                   "skirt"),
    (r"\b(cardigan)\b",                                      "cardigan"),
    (r"\b(sweater|jumper|knitwear|pullover)\b",              "sweater"),
    (r"\b(blouse)\b",                                        "blouse"),
    (r"\b(shirt|polo|flannel)\b",                            "shirt"),
    (r"\b(trouser|chino|slack|pant)\b",                      "trousers"),
    (r"\b(sport(s)?wear|gym|activewear|track(suit)?|jersey)\b", "sportswear"),
    (r"\b(shoe|sneaker|boot|sandal|heel|loafer|trainer)\b",  "shoes"),
    (r"\b(underwear|bra|lingerie|brief|boxer)\b",            "underwear_set"),
    (r"\b(t.?shirt|tee|tank top|crop top)\b",                "t_shirt"),
]

# Maps keywords -> material key
_MATERIAL_RULES = [
    (r"\b(organic cotton|organic)\b",           "organic_cotton"),
    (r"\b(cashmere)\b",                          "cashmere"),
    (r"\b(leather|suede)\b",                     "leather"),
    (r"\b(silk)\b",                              "silk"),
    (r"\b(wool|merino|lambswool)\b",             "wool"),
    (r"\b(linen|flax)\b",                        "linen"),
    (r"\b(lyocell|tencel)\b",                    "lyocell"),
    (r"\b(viscose|rayon)\b",                     "viscose"),
    (r"\b(fleece)\b",                            "fleece"),
    (r"\b(nylon|polyamide)\b",                   "nylon"),
    (r"\b(acrylic)\b",                           "acrylic"),
    (r"\b(polyester)\b",                         "polyester"),
    (r"\b(spandex|elastane|lycra)\b",            "spandex"),
    (r"\b(denim)\b",                             "denim"),
    (r"\b(cotton)\b",                            "cotton"),
    (r"\b(synthetic|man.made|man made)\b",       "synthetic"),
    (r"\b(\d+%\s*(poly|polyester))\b",           "polyester"),
    (r"\b(\d+%\s*cotton)\b",                     "cotton"),
]


def classify(text: str) -> dict:
    """
    Returns {"category": str, "material": str} from a title/caption.
    Falls back to t_shirt / cotton if nothing matches.
    """
    lower = text.lower()

    category = "t_shirt"
    for pattern, cat in _CATEGORY_RULES:
        if re.search(pattern, lower):
            category = cat
            break

    material = "cotton"
    for pattern, mat in _MATERIAL_RULES:
        if re.search(pattern, lower):
            material = mat
            break

    return {"category": category, "material": material}
