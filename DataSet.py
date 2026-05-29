from vinted import Vinted
import torch


vinted = Vinted(domain = "it")

if torch.backends.mps.is_available():
    device = torch.device("mps")
elif torch.cuda.is_available():
    device = torch.device("cuda")
else:
    device = torch.device("cpu")
    print("WARNING!!!   no gpu acceleration was found")

print(f"running on: {device}")

print("AAA")
items = vinted.search(query = "aa")

print(items)