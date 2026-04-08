from sklearn.preprocessing import StandardScaler
from utils.config import CONFIG

def preprocess(df):

    max_cycle = df.groupby("engine_id")["cycle"].max()

    df["RUL"] = df.apply(
        lambda row: max_cycle[row["engine_id"]] - row["cycle"],
        axis=1
    )

    # Clip RUL
    df["RUL"] = df["RUL"].clip(upper=CONFIG["rul_max"])

    # 🔥 NORMALIZE (CRITICAL)
    df["RUL"] = df["RUL"] / CONFIG["rul_max"]

    features = df.columns.difference(["engine_id", "cycle", "RUL"])

    scaler = StandardScaler()
    df[features] = scaler.fit_transform(df[features])

    return df, features