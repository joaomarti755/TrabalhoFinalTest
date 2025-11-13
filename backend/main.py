from fastapi import FastAPI, Request, File, UploadFile, Form
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import numpy as np
import joblib
import os
from io import BytesIO

app = FastAPI()

# Allow requests from the Next.js frontend (default port 3000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = os.path.dirname(__file__)
MODELS_DIR = os.path.join(BASE_DIR, "models")
os.makedirs(MODELS_DIR, exist_ok=True)

templates = Jinja2Templates(directory=os.path.join(BASE_DIR, "templates"))
app.mount("/static", StaticFiles(directory=os.path.join(BASE_DIR, "static")), name="static")

MODEL_PATH = os.path.join(MODELS_DIR, "model_anomalia.pkl")


def load_model(path=MODEL_PATH):
    if not os.path.exists(path):
        return None
    return joblib.load(path)


def detect_anomalies(model, df: pd.DataFrame):
    X = df.select_dtypes(include=[np.number]).copy()
    if X.shape[1] == 0:
        raise ValueError("No numeric columns found in CSV to classify.")

    # Try to align features if model stores feature names
    if hasattr(model, "feature_names_in_"):
        required = list(model.feature_names_in_)
        missing = [c for c in required if c not in X.columns]
        if missing:
            # fallback to numeric columns
            X_used = X
        else:
            X_used = X[required]
    else:
        X_used = X

    # Predict with several fallbacks
    preds = None
    if hasattr(model, "predict"):
        preds = model.predict(X_used)
        preds = np.array(preds)
        uniq = set(np.unique(preds))
        if uniq.issubset({-1, 1}):
            anomalies = preds == -1
        else:
            anomalies = preds == 1
    elif hasattr(model, "decision_function") or hasattr(model, "score_samples"):
        if hasattr(model, "decision_function"):
            scores = model.decision_function(X_used)
        else:
            scores = model.score_samples(X_used)
        # lower scores -> more anomalous for many detectors
        cutoff = np.percentile(scores, 5)
        anomalies = scores < cutoff
    else:
        raise ValueError("Model does not expose a known prediction interface")

    return anomalies, X_used


@app.get("/", response_class=HTMLResponse)
async def index(request: Request):
    model_exists = os.path.exists(MODEL_PATH)
    return templates.TemplateResponse("index.html", {"request": request, "model_exists": model_exists})


@app.post("/upload", response_class=HTMLResponse)
async def upload(request: Request, file: UploadFile = File(...), threshold: float = Form(5.0)):
    contents = await file.read()
    try:
        df = pd.read_csv(BytesIO(contents))
    except Exception as e:
        return templates.TemplateResponse("index.html", {"request": request, "error": f"Could not read CSV: {e}"})

    model = load_model()
    if model is None:
        return templates.TemplateResponse("index.html", {"request": request, "error": "Model file not found. Place model_anomalia.pkl inside backend/models/"})

    try:
        anomalies_mask, X_used = detect_anomalies(model, df)
    except Exception as e:
        return templates.TemplateResponse("index.html", {"request": request, "error": f"Classification error: {e}"})

    df_results = df.copy()
    df_results["_is_anomaly"] = anomalies_mask
    df_results["_label"] = df_results["_is_anomaly"].apply(lambda v: "Anomalia" if v else "Normal")

    pct_anom = float(df_results["_is_anomaly"].mean() * 100)
    alert = pct_anom > float(threshold)

    # Prepare latency trend plot if latency-like column exists
    latency_cols = [c for c in df.columns if any(k in c.lower() for k in ["latency", "elapsed", "response", "time"])]
    latency_col = latency_cols[0] if latency_cols else None

    # Baseline: if there is a baseline.csv in models dir, use it
    baseline_series = None
    baseline_path = os.path.join(MODELS_DIR, "baseline.csv")
    if latency_col and os.path.exists(baseline_path):
        try:
            base_df = pd.read_csv(baseline_path)
            base_lat = base_df[latency_col].dropna().astype(float).tolist()
            baseline_series = base_lat
        except Exception:
            baseline_series = None

    # current latency series
    current_series = df[latency_col].dropna().astype(float).tolist() if latency_col else None

    # send small sample table (first 50 rows)
    sample_html = df_results.head(50).to_html(classes="table table-sm", index=False)

    return templates.TemplateResponse("results.html", {
        "request": request,
        "pct_anom": f"{pct_anom:.2f}",
        "alert": alert,
        "threshold": threshold,
        "sample_table": sample_html,
        "latency_col": latency_col,
        "current_series": current_series,
        "baseline_series": baseline_series,
        "rows": len(df_results),
        "model_path": MODEL_PATH,
    })


@app.post("/api/classify")
async def api_classify(file: UploadFile = File(...)):
    contents = await file.read()
    df = pd.read_csv(BytesIO(contents))
    model = load_model()
    if model is None:
        return {"error": "model not found"}
    anomalies_mask, _ = detect_anomalies(model, df)
    labels = ["Anomalia" if a else "Normal" for a in anomalies_mask]
    pct_anom = float(np.mean(anomalies_mask) * 100)
    # latency detection
    latency_cols = [c for c in df.columns if any(k in c.lower() for k in ["latency", "elapsed", "response", "time"])]
    latency_col = latency_cols[0] if latency_cols else None
    current_series = df[latency_col].dropna().astype(float).tolist() if latency_col else None

    baseline_series = None
    baseline_path = os.path.join(MODELS_DIR, "baseline.csv")
    if latency_col and os.path.exists(baseline_path):
        try:
            base_df = pd.read_csv(baseline_path)
            if latency_col in base_df.columns:
                baseline_series = base_df[latency_col].dropna().astype(float).tolist()
        except Exception:
            baseline_series = None

    sample = df.head(50).to_dict(orient="records")

    return {
        "n_rows": len(labels),
        "pct_anom": pct_anom,
        "labels": labels,
        "latency_col": latency_col,
        "current_series": current_series,
        "baseline_series": baseline_series,
        "sample": sample,
    }
