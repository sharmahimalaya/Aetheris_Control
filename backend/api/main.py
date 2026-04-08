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
torch.set_num_threads(1) # Limit CPU threads to prevent GIL freeze/RAM spikes on Render
model.load_state_dict(torch.load("saved_models/model.pth", map_location=torch.device('cpu')))
model.eval()

@app.get("/")
def root():
    return {"status": "healthy", "service": "Aetheris Control - RUL Prediction API"}

@app.get("/health")
def health():
    return {"status": "ok"}

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