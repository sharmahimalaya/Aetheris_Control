from fastapi import FastAPI, Body
from fastapi.middleware.cors import CORSMiddleware
import torch
from typing import List

from models.transformer import TransformerModel
from utils.config import CONFIG

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust this to specific domains in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

model = TransformerModel(24)
model.load_state_dict(torch.load("saved_models/model.pth"))
model.eval()

@app.post("/predict")
def predict(sequence: List[List[float]] = Body(...)):

    x = torch.tensor(sequence, dtype=torch.float32).unsqueeze(0)

    with torch.no_grad():
        pred = model(x).item()

    # Convert back
    pred = pred * CONFIG["rul_max"]

    return {
        "RUL": pred,
        "status": (
            "Normal" if pred > 60 else
            "Warning" if pred > 20 else
            "Critical"
        )
    }