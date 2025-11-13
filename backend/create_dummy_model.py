"""
Gera um modelo de exemplo (IsolationForest) e salva em backend/models/model_anomalia.pkl
Uso: python create_dummy_model.py
"""
import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
import joblib
import os

OUT = os.path.join(os.path.dirname(__file__), "models")
os.makedirs(OUT, exist_ok=True)

def main():
    # gera dados normais com 3 features e algumas anomalias
    rng = np.random.RandomState(42)
    X_normal = rng.normal(loc=0, scale=1.0, size=(1000, 3))
    X_anom = rng.normal(loc=8, scale=1.0, size=(50, 3))
    X = np.vstack([X_normal, X_anom])

    cols = ["f1","f2","f3"]
    df = pd.DataFrame(X, columns=cols)

    clf = IsolationForest(contamination=0.05, random_state=42)
    clf.fit(df)

    path = os.path.join(OUT, "model_anomalia.pkl")
    joblib.dump(clf, path)
    print("Dummy model saved to:", path)

    # Save a simple baseline CSV for plotting (optional)
    baseline = pd.DataFrame({"elapsed": np.abs(rng.normal(100, 10, size=200))})
    baseline.to_csv(os.path.join(OUT, "baseline.csv"), index=False)
    print("Baseline saved to:", os.path.join(OUT, "baseline.csv"))

if __name__ == '__main__':
    main()
