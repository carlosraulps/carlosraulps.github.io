"""
Baseline Machine Learning Regression Workflow for 2D Carbon Allotropes.
Evaluates Ridge, Random Forest, and Gradient Boosting models targeting relative
formation energy (Delta E in eV/atom vs. graphene).
Strictly prevents data leakage via canonical filtering, GroupKFold by crystal system,
and training-fold-only preprocessing with honest uncertainty reporting.
"""

from __future__ import annotations
import json
from pathlib import Path
from typing import Any, Dict, List, Tuple
import numpy as np
import pandas as pd
from sklearn.linear_model import Ridge
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.model_selection import KFold, GroupKFold
from sklearn.preprocessing import StandardScaler
from sklearn.decomposition import PCA
from sklearn.metrics import r2_score, mean_absolute_error, root_mean_squared_error


FEATURE_COLUMNS = [
    "area_per_atom",
    "atomic_area_density",
    "in_plane_ratio_b_a",
    "bond_length_mean",
    "bond_length_std",
    "bond_length_span",
    "bond_angle_mean",
    "bond_angle_std",
    "bond_angle_msd_120",
    "bond_angle_rmsd_120",
    "mean_coordination",
    "fraction_coord3",
    "ring_entropy",
    "fraction_ring_4",
    "fraction_ring_5",
    "fraction_ring_6",
    "fraction_ring_7",
    "fraction_ring_8",
    "non_hexagonal_fraction",
    "stone_wales_fraction",
]

TARGET_COLUMN = "delta_e_ev_per_atom"


def run_cross_validation(
    df: pd.DataFrame,
    features: List[str] = FEATURE_COLUMNS,
    target: str = TARGET_COLUMN,
    n_splits: int = 5,
    random_state: int = 42,
) -> Dict[str, Any]:
    """
    Runs structure-family-aware GroupKFold cross-validation on canonical allotropes.
    Evaluates Ridge, Random Forest, and Gradient Boosting models.
    """
    X = df[features].values
    y = df[target].values
    groups = df["crystal_system"].astype("category").cat.codes.values

    # Fallback to KFold if number of unique groups is less than n_splits
    unique_groups = len(np.unique(groups))
    if unique_groups >= n_splits:
        cv = GroupKFold(n_splits=n_splits)
        split_gen = list(cv.split(X, y, groups=groups))
        cv_type = f"GroupKFold({n_splits} splits grouped by crystal_system)"
    else:
        cv = KFold(n_splits=n_splits, shuffle=True, random_state=random_state)
        split_gen = list(cv.split(X, y))
        cv_type = f"KFold({n_splits} splits with shuffle)"

    models = {
        "Ridge": Ridge(alpha=1.0),
        "RandomForest": RandomForestRegressor(n_estimators=100, random_state=random_state),
        "GradientBoosting": GradientBoostingRegressor(
            n_estimators=100, learning_rate=0.05, max_depth=3, random_state=random_state
        ),
    }

    results: Dict[str, Any] = {}

    for name, model in models.items():
        oof_preds = np.zeros(len(y))
        fold_r2 = []
        fold_mae = []
        fold_rmse = []

        for train_idx, val_idx in split_gen:
            X_train, X_val = X[train_idx], X[val_idx]
            y_train, y_val = y[train_idx], y[val_idx]

            # Leakage prevention: fit scaler strictly on training fold
            scaler = StandardScaler()
            if name == "Ridge":
                X_train_scaled = scaler.fit_transform(X_train)
                X_val_scaled = scaler.transform(X_val)
                model.fit(X_train_scaled, y_train)
                preds = model.predict(X_val_scaled)
            else:
                model.fit(X_train, y_train)
                preds = model.predict(X_val)

            oof_preds[val_idx] = preds
            fold_r2.append(float(r2_score(y_val, preds)))
            fold_mae.append(float(mean_absolute_error(y_val, preds)))
            fold_rmse.append(float(root_mean_squared_error(y_val, preds)))

        overall_r2 = float(r2_score(y, oof_preds))
        overall_mae = float(mean_absolute_error(y, oof_preds))
        overall_rmse = float(root_mean_squared_error(y, oof_preds))

        results[name] = {
            "overall_r2": round(overall_r2, 4),
            "overall_mae_ev": round(overall_mae, 4),
            "overall_rmse_ev": round(overall_rmse, 4),
            "fold_r2_mean": round(float(np.mean(fold_r2)), 4),
            "fold_r2_std": round(float(np.std(fold_r2)), 4),
            "fold_mae_mean": round(float(np.mean(fold_mae)), 4),
            "fold_mae_std": round(float(np.std(fold_mae)), 4),
            "fold_rmse_mean": round(float(np.mean(fold_rmse)), 4),
            "fold_rmse_std": round(float(np.std(fold_rmse)), 4),
            "oof_predictions": [round(float(p), 4) for p in oof_preds],
        }

    # Feature Importance via Random Forest fitted on full canonical set
    rf_full = RandomForestRegressor(n_estimators=100, random_state=random_state)
    rf_full.fit(X, y)
    importances = rf_full.feature_importances_
    sorted_feat_indices = np.argsort(importances)[::-1]
    ranked_features = [
        {
            "feature": features[i],
            "importance": round(float(importances[i]), 4),
            "importance_pct": round(float(importances[i] * 100), 2),
        }
        for i in sorted_feat_indices
    ]

    # Dimensionality Reduction: PCA 2D embedding
    scaler_pca = StandardScaler()
    X_scaled = scaler_pca.fit_transform(X)
    pca = PCA(n_components=2, random_state=random_state)
    pca_coords = pca.fit_transform(X_scaled)
    var_ratio = [round(float(v), 4) for v in pca.explained_variance_ratio_]

    pca_points = []
    for idx, row in df.iterrows():
        pca_points.append({
            "id": row["id"],
            "canonical_id": row["canonical_id"],
            "code": row["code"],
            "literature_name": row["literature_name"],
            "girao_symbol": row["girao_symbol"],
            "crystal_system": row["crystal_system"],
            "delta_e_ev_per_atom": round(float(row["delta_e_ev_per_atom"]), 4),
            "pca_x": round(float(pca_coords[idx, 0]), 4),
            "pca_y": round(float(pca_coords[idx, 1]), 4),
            "oof_pred_rf": round(float(results["RandomForest"]["oof_predictions"][idx]), 4),
            "residual_rf": round(float(row["delta_e_ev_per_atom"] - results["RandomForest"]["oof_predictions"][idx]), 4),
        })

    # Correlation Matrix
    corr_df = df[features + [target]].corr()
    corr_dict = {
        col: {c2: round(float(val), 4) for c2, val in corr_df[col].items()}
        for col in corr_df.columns
    }

    # Descriptive Statistics for features
    stats_dict = {}
    for feat in features + [target]:
        series = df[feat]
        stats_dict[feat] = {
            "mean": round(float(series.mean()), 4),
            "std": round(float(series.std()), 4),
            "min": round(float(series.min()), 4),
            "p25": round(float(series.quantile(0.25)), 4),
            "median": round(float(series.median()), 4),
            "p75": round(float(series.quantile(0.75)), 4),
            "max": round(float(series.max()), 4),
        }

    return {
        "status": "success",
        "sample_size": len(df),
        "validation_strategy": cv_type,
        "features": features,
        "target": target,
        "models": results,
        "feature_importances": ranked_features,
        "pca": {
            "explained_variance_ratio": var_ratio,
            "total_variance_explained": round(sum(var_ratio), 4),
            "data_points": pca_points,
            "pc1_loadings": {features[i]: round(float(pca.components_[0, i]), 4) for i in range(len(features))},
            "pc2_loadings": {features[i]: round(float(pca.components_[1, i]), 4) for i in range(len(features))},
        },
        "descriptive_statistics": stats_dict,
        "correlations": corr_dict,
    }


def execute_and_save_baseline(
    workspace_root: Path | str,
    output_path: Optional[Path | str] = None,
) -> Dict[str, Any]:
    """Generates baseline ML regression models and saves outputs to data/ml/baseline_models.json."""
    ws = Path(workspace_root)
    dataset_path = ws / "data" / "ml" / "carbon2d_ml_dataset.csv"
    if not dataset_path.exists():
        from backend.app.services.ml_exporter import export_ml_datasets
        export_ml_datasets(ws)

    df_canonical = pd.read_csv(dataset_path)
    res = run_cross_validation(df_canonical)

    out_p = Path(output_path) if output_path else ws / "data" / "ml" / "baseline_models.json"
    out_p.parent.mkdir(parents=True, exist_ok=True)
    with open(out_p, "w", encoding="utf-8") as f:
        json.dump(res, f, indent=2)

    return res


if __name__ == "__main__":
    res = execute_and_save_baseline(Path(__file__).resolve().parent.parent.parent.parent)
    print("Baseline ML models successfully trained and evaluated.")
    for m, vals in res["models"].items():
        print(f"  {m}: R2 = {vals['overall_r2']:.4f}, MAE = {vals['overall_mae_ev']:.4f} eV/atom, RMSE = {vals['overall_rmse_ev']:.4f} eV/atom")
