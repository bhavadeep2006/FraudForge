import pytest
from app.api.health import get_health, get_model_info
from app.api.dataset import get_dataset_info
from app.api.generation import generate_transactions, get_generation, export_csv
from app.api.evaluation import evaluate_synthetic_data
from app.schemas import GenerateRequest, EvaluateRequest
from app.services.generation_service import GenerationService
from fastapi import HTTPException

def test_health():
    res = get_health()
    assert res.status == "healthy"
    assert res.backend_version == "1.0.0"
    assert res.device in ("cpu", "cuda")
    assert res.artifacts_available is True

def test_model_info():
    info = get_model_info()
    assert info["architecture"] == "Conditional WGAN-GP (cGAN V2)"
    assert info["latent_dim"] == 128
    assert info["condition_dim"] == 5
    assert info["feature_dim"] == 31
    assert len(info["output_schema"]) == 31

def test_dataset_info():
    info = get_dataset_info()
    assert isinstance(info.available, bool)
    assert len(info.message) > 0

def test_invalid_generation_requests():
    # Pydantic validation checks
    with pytest.raises(Exception):
        GenerateRequest(num_rows=0, fraud_percentage=5.0)
    
    with pytest.raises(Exception):
        GenerateRequest(num_rows=60000, fraud_percentage=5.0)
    
    with pytest.raises(Exception):
        GenerateRequest(num_rows=100, fraud_percentage=-1.0)
        
    with pytest.raises(Exception):
        GenerateRequest(num_rows=100, fraud_percentage=105.0)

def test_fraud_count_rounding_rule():
    gen_service = GenerationService()
    # 5% of 1000 = 50
    f, l = gen_service.calculate_counts(1000, 5.0)
    assert f == 50 and l == 950
    
    # 0.172% of 1000 = 1.72 -> rounded to 2
    f, l = gen_service.calculate_counts(1000, 0.172)
    assert f == 2 and l == 998
    
    # 0%
    f, l = gen_service.calculate_counts(500, 0.0)
    assert f == 0 and l == 500
    
    # 100%
    f, l = gen_service.calculate_counts(500, 100.0)
    assert f == 500 and l == 0

def test_generation_execution_and_schema():
    req = GenerateRequest(num_rows=150, fraud_percentage=10.0, seed=42)
    res = generate_transactions(req)
    
    assert res.summary.total_rows == 150
    assert res.summary.fraud_count == 15
    assert res.summary.legitimate_count == 135
    assert res.summary.seed == 42
    assert "cWGAN-GP" in res.summary.model_version or "Simulation" in res.summary.model_version
    
    columns = res.columns
    assert "Time" in columns
    assert "Amount" in columns
    assert "Class" in columns
    assert all(f"V{i}" in columns for i in range(1, 29))
    
    rows = res.rows
    assert len(rows) > 0
    first_row = rows[0]
    assert "Amount" in first_row
    assert "Class" in first_row
    assert first_row["Class"] in (0, 1)

def test_random_seed_reproducibility():
    p1 = GenerateRequest(num_rows=50, fraud_percentage=6.0, seed=1234)
    res1 = generate_transactions(p1)
    
    p2 = GenerateRequest(num_rows=50, fraud_percentage=6.0, seed=1234)
    res2 = generate_transactions(p2)
    
    # Same seed should give identical rows
    assert res1.rows == res2.rows
    
    # Different seed should yield different rows
    p3 = GenerateRequest(num_rows=50, fraud_percentage=6.0, seed=9999)
    res3 = generate_transactions(p3)
    assert res1.rows != res3.rows

def test_generation_retrieval_and_csv_export():
    req = GenerateRequest(num_rows=80, fraud_percentage=5.0, seed=77)
    gen = generate_transactions(req)
    gen_id = gen.generation_id
    
    # Retrieve by ID
    retrieved = get_generation(gen_id)
    assert retrieved.generation_id == gen_id
    assert retrieved.total_count == 80
    
    # Export CSV
    csv_resp = export_csv(gen_id)
    assert csv_resp.media_type == "text/csv"
    lines = csv_resp.body.decode().strip().split("\n")
    # Header + 80 data rows = 81 lines
    assert len(lines) == 81
    assert "Time,V1,V2" in lines[0]

def test_evaluation_endpoint():
    req = EvaluateRequest(sample_size=150)
    ev = evaluate_synthetic_data(req)
    
    assert ev.evaluation_id is not None
    assert 0.0 <= ev.fidelity.mean_ks <= 1.0
    assert ev.fidelity.correlation_difference >= 0.0
    assert 0.0 <= ev.utility.tstr.auprc <= 1.0
    assert ev.privacy.exact_copies_count >= 0
    assert len(ev.limitations) > 0
