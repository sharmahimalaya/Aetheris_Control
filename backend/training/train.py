import torch
from torch.utils.data import DataLoader, TensorDataset

from preprocessing.data_loader import load_data
from preprocessing.preprocess import preprocess
from preprocessing.sequence_builder import build_sequences
from models.transformer import TransformerModel
from utils.config import CONFIG

# Load data
df = load_data("data/raw/train_FD001.txt")

# Preprocess
df, features = preprocess(df)

# Build sequences
X, y = build_sequences(df, features)

# Dataset
dataset = TensorDataset(X, y)
loader = DataLoader(
    dataset,
    batch_size=CONFIG["batch_size"],
    shuffle=True
)

# Model
model = TransformerModel(len(features))

optimizer = torch.optim.Adam(
    model.parameters(),
    lr=CONFIG["learning_rate"]
)

loss_fn = torch.nn.MSELoss()

# Training loop
for epoch in range(CONFIG["epochs"]):

    total_loss = 0

    for xb, yb in loader:
        optimizer.zero_grad()

        pred = model(xb)
        loss = loss_fn(pred, yb)

        loss.backward()
        optimizer.step()

        total_loss += loss.item()

    print(f"Epoch {epoch} Loss: {total_loss:.4f}")

# Save model
torch.save(model.state_dict(), "saved_models/model.pth")