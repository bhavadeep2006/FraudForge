# Backend - Tabular Data Synthesizer for Finance (cGAN)

FastAPI-powered machine learning backend providing Conditional Wasserstein GAN (cWGAN-GP) inference, training pipelines, empirical evaluation (Fidelity, Utility, Privacy), and dataset management for credit card transaction synthesis.

---

## 1. Directory Structure

```
backend/
├── app/
│   ├── main.py                  # FastAPI application entrypoint & middleware
│   ├── config.py                # Application settings & environment config
│   ├── schemas.py               # Pydantic request & response models
│   ├── api/
│   │   ├── health.py            # /api/health, /api/model/info
│   │   ├── generation.py        # /api/generate, /api/generations/{id}, /api/export/{id}
│   │   ├── evaluation.py        # /api/evaluate, /api/evaluation/{id}
│   │   └── dataset.py           # /api/dataset/info
│   ├── services/
│   │   ├── model_service.py     # PyTorch generator, critic, model lifecycle
│   │   ├── generation_service.py # Deterministic noise, condition encoding, inverse transform
│   │   ├── evaluation_service.py # KS distance, TSTR AUPRC, DCR privacy audit
│   │   └── dataset_service.py   # Benchmark credit card dataset loader
│   └── utils/
│       ├── preprocessing.py     # Tabular forward & inverse scaler (31 features)
│       └── reproducibility.py   # Deterministic seed configuration
├── models/
│   ├── cgan_generator.pt        # Trained PyTorch generator checkpoint
│   └── preprocessor.json        # Fitted preprocessing parameters
├── training/
│   └── train.py                 # WGAN-GP training script with gradient penalty
├── tests/
│   ├── test_api.py              # API endpoint validation & schema tests
│   └── test_preprocessing.py    # Preprocessor fit & inverse transformation tests
├── requirements.txt
├── .env.example
└── README.md
```

---

## 2. Model Architecture

- **Model Type**: Conditional Wasserstein GAN with Gradient Penalty (cWGAN-GP V2)
- **Latent Dimension**: $z \sim \mathcal{N}(0, I_{128})$ (128 continuous dimensions)
- **Condition Dimension**: $c \in \mathbb{R}^5$ (1 binary Class label + 4 one-hot Amount quartile tiers)
- **Generator**:
  - Linear projection ($133 \to 256$) with LeakyReLU(0.2)
  - 2 Residual Blocks with 256 units, LayerNorm, and skip connections
  - Linear projection ($256 \to 31$) with Tanh activation
- **Critic**:
  - Linear layers with LeakyReLU(0.2) and PacGAN packing support
  - Wasserstein distance loss with Gradient Penalty ($\lambda = 10.0$)
- **Feature Space (31 Dimensions)**:
  - 28 PCA features (`V1` through `V28`)
  - 1 Log-transformed normalized Amount (`log1p` scaled to $[-1, 1]$)
  - 2 Cyclic Time encodings: $\sin(2\pi \cdot \text{Hour} / 24)$ and $\cos(2\pi \cdot \text{Hour} / 24)$

---

## 3. Installation & Setup

### Requirements
- Python 3.10+
- PyTorch 2.0+ (CPU or CUDA)

### Virtual Environment Setup
```bash
cd backend
python -m venv .venv

# On Windows PowerShell:
.venv\Scripts\Activate.ps1

# On Linux / macOS:
source .venv/bin/activate

pip install -r requirements.txt
```

### Environment Configuration
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

---

## 4. Running the Server

Start the FastAPI application with Uvicorn:
```bash
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
Interactive API docs are available at `http://127.0.0.1:8000/docs`.

---

## 5. Model Training

### Smoke Test (Rapid Verification)
Trains generator and critic on mock benchmark transactions for 2 epochs:
```bash
python training/train.py --smoke-test
```

### Full Training Run
Place the real `creditcard.csv` in `backend/data/creditcard.csv` and run:
```bash
python training/train.py --dataset data/creditcard.csv --epochs 25 --batch-size 64
```
Artifacts are automatically exported to `models/cgan_generator.pt` and `models/preprocessor.json`.

---

## 6. Automated Testing

Run the automated test suite with pytest:
```bash
python -m pytest tests -v
```
All tests verify endpoints, schema compliance, rounding rules, seed reproducibility, and preprocessor inversion.
