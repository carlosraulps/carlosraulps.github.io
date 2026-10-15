"""
Test suite for ML Dataset Exporter and Baseline Regression Workflow.
Validates CSV and Parquet generation, absence of missing values,
and cross-validation integrity on canonical allotropes.
"""

from pathlib import Path
import pytest
import pandas as pd
import json

from backend.app.services.ml_exporter import export_ml_datasets
from backend.app.services.ml_baseline import run_cross_validation

WS_ROOT = Path(__file__).resolve().parent.parent.parent


def test_ml_dataset_export_integrity(tmp_path):
    res = export_ml_datasets(WS_ROOT, output_dir=tmp_path)
    assert res["status"] == "success"
    assert res["total_rows"] == 61
    assert res["canonical_rows"] == 53
    assert res["duplicate_rows"] == 8

    # Verify CSV and Parquet files
    canon_csv = tmp_path / "carbon2d_ml_dataset.csv"
    canon_parquet = tmp_path / "carbon2d_ml_dataset.parquet"
    meta_json = tmp_path / "feature_metadata.json"

    assert canon_csv.exists()
    assert canon_parquet.exists()
    assert meta_json.exists()

    df = pd.read_csv(canon_csv)
    assert len(df) == 53
    # Check no missing values
    assert df.isna().sum().sum() == 0

    # Check target exists
    assert "delta_e_ev_per_atom" in df.columns
    assert df["delta_e_ev_per_atom"].min() == 0.0  # graphene


def test_baseline_regression_cross_validation():
    dataset_p = WS_ROOT / "data" / "ml" / "carbon2d_ml_dataset.csv"
    assert dataset_p.exists()
    df = pd.read_csv(dataset_p)

    res = run_cross_validation(df)
    assert res["status"] == "success"
    assert res["sample_size"] == 53
    assert "RandomForest" in res["models"]
    assert "Ridge" in res["models"]
    assert "GradientBoosting" in res["models"]

    # MAE should be reasonable (< 0.15 eV/atom)
    rf_mae = res["models"]["RandomForest"]["overall_mae_ev"]
    assert rf_mae < 0.15

    # PCA
    assert len(res["pca"]["explained_variance_ratio"]) == 2
    assert res["pca"]["total_variance_explained"] > 0.45
