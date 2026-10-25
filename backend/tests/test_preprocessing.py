import pytest
import numpy as np
import pandas as pd
from app.utils.preprocessing import TabularPreprocessor

def test_preprocessor_fit_transform_inverse():
    # Create sample synthetic dataframe
    n = 100
    rng = np.random.RandomState(42)
    data = {
        "Time": rng.uniform(0, 172800, n),
        "Amount": rng.uniform(1, 500, n),
        "Class": rng.choice([0, 1], size=n, p=[0.9, 0.1])
    }
    for i in range(1, 29):
        data[f"V{i}"] = rng.normal(0, 1, n)
        
    df = pd.DataFrame(data)
    
    prep = TabularPreprocessor()
    prep.fit(df)
    assert prep.is_fitted
    
    X_trans, conditions = prep.transform(df)
    assert X_trans.shape == (n, 31)
    assert conditions.shape == (n, 5)
    
    # Values should be scaled to [-1, 1]
    assert np.all(X_trans >= -1.0) and np.all(X_trans <= 1.0)
    
    # Invert
    inv_df = prep.inverse_transform(X_trans, conditions)
    assert inv_df.shape == (n, 31)
    assert "Time" in inv_df.columns
    assert "Amount" in inv_df.columns
    assert "Class" in inv_df.columns
    assert all(f"V{i}" in inv_df.columns for i in range(1, 29))
    
    # Check that Amount is non-negative
    assert (inv_df["Amount"] >= 0).all()
    # Check that Class matches condition classes
    assert (inv_df["Class"].values == df["Class"].values).all()
