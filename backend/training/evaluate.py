import torch
import numpy as np

from preprocessing.data_loader import load_data
from preprocessing.preprocess import preprocess
from preprocessing.sequence_builder import build_sequences
from models.transformer import TransformerModel
from utils.metrics import rmse, mae
from utils.config import CONFIG

# Load data
df = load_data("data/raw/train_FD001.txt")
df, features = preprocess(df)

X, y = build_sequences(df, features)

# Load model
model = TransformerModel(len(features))
model.load_state_dict(torch.load("saved_models/model.pth"))
model.eval()

# Predict
with torch.no_grad():
    preds = model(X).numpy().flatten()
    y_true = y.numpy().flatten()

# 🔥 Convert back to original scale
preds = preds * CONFIG["rul_max"]
y_true = y_true * CONFIG["rul_max"]

print("RMSE:", rmse(y_true, preds))
print("MAE:", mae(y_true, preds))