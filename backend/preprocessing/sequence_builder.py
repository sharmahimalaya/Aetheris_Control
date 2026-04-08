import numpy as np
import torch
from utils.config import CONFIG

def build_sequences(df, features):

    seq_len = CONFIG["sequence_length"]

    X, y = [], []

    for eid in df.engine_id.unique():
        engine = df[df.engine_id == eid]
        vals = engine[features].values
        rul = engine["RUL"].values

        for i in range(len(vals) - seq_len):
            X.append(vals[i:i+seq_len])
            y.append(rul[i+seq_len])

    X = torch.tensor(np.array(X), dtype=torch.float32)
    y = torch.tensor(np.array(y), dtype=torch.float32).unsqueeze(1)

    return X, y