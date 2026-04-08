import pandas as pd

def load_data(path):
    df = pd.read_csv(path, sep=" ", header=None)
    df = df.dropna(axis=1)

    df.columns = (
        ["engine_id", "cycle"] +
        [f"op_{i}" for i in range(1,4)] +
        [f"s_{i}" for i in range(1,22)]
    )

    return df