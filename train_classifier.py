"""
Image classifier: takes an image, outputs a single label (e.g. "t-shirt").

Trains a model on YOUR dataset using transfer learning (ResNet18 pretrained
on ImageNet). Works well even with a few hundred images per class.

------------------------------------------------------------------------------
DATASET LAYOUT  (ImageFolder format — folder name == label)
------------------------------------------------------------------------------
data/
  train/
    t-shirt/      img001.jpg  img002.jpg ...
    jeans/        ...
    shoes/        ...
  val/
    t-shirt/      ...
    jeans/        ...
    shoes/        ...

The folder names ARE the labels the model will output.

------------------------------------------------------------------------------
SETUP
------------------------------------------------------------------------------
pip install torch torchvision pillow

------------------------------------------------------------------------------
USAGE
------------------------------------------------------------------------------
Train:    python train_classifier.py --data ./data --epochs 15
Predict:  python train_classifier.py --predict path/to/image.jpg
"""

import argparse
import json
import os

import torch
import torch.nn as nn
from PIL import Image
from torch.utils.data import DataLoader
from torchvision import datasets, models, transforms

DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")
MODEL_PATH = "classifier.pth"
LABELS_PATH = "labels.json"
IMG_SIZE = 224

# ImageNet normalization (required for pretrained models)
NORMALIZE = transforms.Normalize(
    mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]
)

train_tf = transforms.Compose([
    transforms.RandomResizedCrop(IMG_SIZE, scale=(0.7, 1.0)),
    transforms.RandomHorizontalFlip(),
    transforms.ColorJitter(0.2, 0.2, 0.2),
    transforms.ToTensor(),
    NORMALIZE,
])

eval_tf = transforms.Compose([
    transforms.Resize(256),
    transforms.CenterCrop(IMG_SIZE),
    transforms.ToTensor(),
    NORMALIZE,
])


def build_model(num_classes):
    model = models.resnet18(weights=models.ResNet18_Weights.DEFAULT)
    # Freeze the backbone, only train the final layer (fast + needs less data).
    for p in model.parameters():
        p.requires_grad = False
    model.fc = nn.Linear(model.fc.in_features, num_classes)
    return model.to(DEVICE)


def train(data_dir, epochs, batch_size, lr):
    train_ds = datasets.ImageFolder(os.path.join(data_dir, "train"), train_tf)
    val_ds = datasets.ImageFolder(os.path.join(data_dir, "val"), eval_tf)

    labels = train_ds.classes  # e.g. ["jeans", "shoes", "t-shirt"]
    print(f"Classes: {labels}")

    train_dl = DataLoader(train_ds, batch_size=batch_size, shuffle=True, num_workers=2)
    val_dl = DataLoader(val_ds, batch_size=batch_size, num_workers=2)

    model = build_model(len(labels))
    criterion = nn.CrossEntropyLoss()
    optimizer = torch.optim.Adam(model.fc.parameters(), lr=lr)

    best_acc = 0.0
    for epoch in range(1, epochs + 1):
        model.train()
        running = 0.0
        for x, y in train_dl:
            x, y = x.to(DEVICE), y.to(DEVICE)
            optimizer.zero_grad()
            loss = criterion(model(x), y)
            loss.backward()
            optimizer.step()
            running += loss.item() * x.size(0)
        train_loss = running / len(train_ds)

        # validate
        model.eval()
        correct = 0
        with torch.no_grad():
            for x, y in val_dl:
                x, y = x.to(DEVICE), y.to(DEVICE)
                preds = model(x).argmax(1)
                correct += (preds == y).sum().item()
        val_acc = correct / len(val_ds)

        print(f"epoch {epoch:2d}/{epochs}  loss {train_loss:.4f}  val_acc {val_acc:.3f}")

        if val_acc >= best_acc:
            best_acc = val_acc
            torch.save(model.state_dict(), MODEL_PATH)
            with open(LABELS_PATH, "w") as f:
                json.dump(labels, f)

    print(f"\nDone. Best val accuracy: {best_acc:.3f}")
    print(f"Saved -> {MODEL_PATH}, {LABELS_PATH}")


def predict(image_path):
    with open(LABELS_PATH) as f:
        labels = json.load(f)
    model = build_model(len(labels))
    model.load_state_dict(torch.load(MODEL_PATH, map_location=DEVICE))
    model.eval()

    img = Image.open(image_path).convert("RGB")
    x = eval_tf(img).unsqueeze(0).to(DEVICE)
    with torch.no_grad():
        idx = model(x).argmax(1).item()
    print(labels[idx])  # <-- the single-word output


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", default="./data", help="dataset root")
    ap.add_argument("--epochs", type=int, default=15)
    ap.add_argument("--batch-size", type=int, default=32)
    ap.add_argument("--lr", type=float, default=1e-3)
    ap.add_argument("--predict", metavar="IMAGE", help="classify one image")
    args = ap.parse_args()

    if args.predict:
        predict(args.predict)
    else:
        train(args.data, args.epochs, args.batch_size, args.lr)
