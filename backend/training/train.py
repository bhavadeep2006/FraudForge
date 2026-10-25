import argparse
import os
import sys
from pathlib import Path
from typing import Optional, List, Dict
import numpy as np
import pandas as pd
import torch
import torch.nn as nn
import torch.optim as optim
from torch.autograd import grad
from torch.utils.data import DataLoader, TensorDataset

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from app.config import settings
from app.services.model_service import ConditionalGenerator, ConditionalCritic
from app.utils.preprocessing import TabularPreprocessor
from app.utils.reproducibility import set_seed

def compute_gradient_penalty(
    critic: nn.Module,
    real_samples: torch.Tensor,
    fake_samples: torch.Tensor,
    conditions: torch.Tensor,
    device: torch.device
) -> torch.Tensor:
    """Calculates the gradient penalty for WGAN-GP."""
    alpha = torch.rand((real_samples.size(0), 1), device=device)
    alpha = alpha.expand_as(real_samples)
    
    interpolates = (alpha * real_samples + ((1 - alpha) * fake_samples)).requires_grad_(True)
    d_interpolates = critic(interpolates, conditions)
    
    fake = torch.ones(d_interpolates.size(), device=device, requires_grad=False)
    
    gradients = grad(
        outputs=d_interpolates,
        inputs=interpolates,
        grad_outputs=fake,
        create_graph=True,
        retain_graph=True,
        only_inputs=True
    )[0]
    
    gradients = gradients.view(gradients.size(0), -1)
    gradient_penalty = ((gradients.norm(2, dim=1) - 1) ** 2).mean()
    return gradient_penalty

def generate_mock_creditcard_data(n_samples: int = 5000, seed: int = 42) -> pd.DataFrame:
    """Generates synthetic benchmark credit card transactions for smoke testing."""
    rng = np.random.RandomState(seed)
    fraud_n = int(n_samples * 0.05)
    legit_n = n_samples - fraud_n
    
    data = {"Time": rng.uniform(0, 172800, n_samples)}
    for i in range(1, 29):
        # Differentiated feature distribution
        f_vals = rng.normal(-1.0, 2.0, fraud_n)
        l_vals = rng.normal(0.0, 1.0, legit_n)
        data[f"V{i}"] = np.concatenate([f_vals, l_vals])
        
    f_amt = np.exp(rng.normal(np.log(150), 1.2, fraud_n))
    l_amt = np.exp(rng.normal(np.log(60), 0.8, legit_n))
    data["Amount"] = np.round(np.concatenate([f_amt, l_amt]), 2)
    data["Class"] = np.concatenate([np.ones(fraud_n, dtype=int), np.zeros(legit_n, dtype=int)])
    
    df = pd.DataFrame(data)
    return df.sample(frac=1.0, random_state=seed).reset_index(drop=True)

def train(
    dataset_path: Optional[str] = None,
    epochs: int = 20,
    batch_size: int = 64,
    lr: float = 2e-4,
    n_critic: int = 5,
    lambda_gp: float = 10.0,
    smoke_test: bool = False,
    output_dir: Optional[Path] = None
):
    set_seed(42)
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"[Training] Using device: {device}")
    
    if output_dir is None:
        output_dir = settings.MODEL_DIR
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # 1. Dataset loading & split
    raw_df = None
    if dataset_path and Path(dataset_path).exists():
        print(f"[Training] Loading dataset from {dataset_path}...")
        raw_df = pd.read_csv(dataset_path)
    elif settings.DATASET_PATH.exists():
        print(f"[Training] Loading dataset from default {settings.DATASET_PATH}...")
        raw_df = pd.read_csv(settings.DATASET_PATH)
    else:
        print("[Training] Real dataset not found. Generating mock benchmark data for pipeline execution...")
        raw_df = generate_mock_creditcard_data(n_samples=2000 if smoke_test else 10000)

    if smoke_test:
        raw_df = raw_df.head(500)
        epochs = 2
        batch_size = 32
        print("[Training] Smoke test mode enabled (epochs=2, samples=500).")

    # Split train/test (80/20)
    train_size = int(len(raw_df) * 0.8)
    train_df = raw_df.iloc[:train_size].reset_index(drop=True)
    test_df = raw_df.iloc[train_size:].reset_index(drop=True)
    
    # 2. Fit Preprocessor ONLY on training set
    print("[Training] Fitting preprocessor on training split...")
    preprocessor = TabularPreprocessor()
    preprocessor.fit(train_df)
    
    X_train_trans, c_train = preprocessor.transform(train_df)
    
    tensor_x = torch.from_numpy(X_train_trans)
    tensor_c = torch.from_numpy(c_train)
    dataset = TensorDataset(tensor_x, tensor_c)
    dataloader = DataLoader(dataset, batch_size=batch_size, shuffle=True, drop_last=True)
    
    # 3. Initialize Models
    generator = ConditionalGenerator(
        latent_dim=settings.LATENT_DIM,
        condition_dim=settings.CONDITION_DIM,
        hidden_dim=settings.HIDDEN_UNITS,
        num_res_blocks=settings.NUM_RES_BLOCKS,
        output_dim=settings.FEATURE_DIM
    ).to(device)
    
    critic = ConditionalCritic(
        feature_dim=settings.FEATURE_DIM,
        condition_dim=settings.CONDITION_DIM,
        hidden_dim=settings.HIDDEN_UNITS,
        pac=1
    ).to(device)
    
    opt_g = optim.Adam(generator.parameters(), lr=lr, betas=(0.5, 0.9))
    opt_c = optim.Adam(critic.parameters(), lr=lr, betas=(0.5, 0.9))
    
    print(f"[Training] Starting WGAN-GP training loop ({epochs} epochs)...")
    for epoch in range(1, epochs + 1):
        g_loss_val = 0.0
        c_loss_val = 0.0
        batches = 0
        
        for batch_idx, (real_x, real_c) in enumerate(dataloader):
            real_x = real_x.to(device)
            real_c = real_c.to(device)
            b_size = real_x.size(0)
            
            # --- Train Critic ---
            opt_c.zero_grad()
            z = torch.randn(b_size, settings.LATENT_DIM, device=device)
            fake_x = generator(z, real_c).detach()
            
            d_real = critic(real_x, real_c).mean()
            d_fake = critic(fake_x, real_c).mean()
            gp = compute_gradient_penalty(critic, real_x, fake_x, real_c, device)
            
            c_loss = d_fake - d_real + lambda_gp * gp
            c_loss.backward()
            opt_c.step()
            c_loss_val += c_loss.item()
            
            # --- Train Generator every n_critic steps ---
            if batch_idx % n_critic == 0:
                opt_g.zero_grad()
                gen_z = torch.randn(b_size, settings.LATENT_DIM, device=device)
                gen_fake = generator(gen_z, real_c)
                g_loss = -critic(gen_fake, real_c).mean()
                g_loss.backward()
                opt_g.step()
                g_loss_val += g_loss.item()
                batches += 1
                
        avg_c = c_loss_val / len(dataloader)
        avg_g = g_loss_val / max(batches, 1)
        print(f"Epoch [{epoch}/{epochs}] Critic Loss: {avg_c:.4f} | Generator Loss: {avg_g:.4f}")

    # 4. Save Artifacts
    generator_path = output_dir / settings.CHECKPOINT_NAME
    preprocessor_path = output_dir / "preprocessor.json"
    
    torch.save(generator.state_dict(), generator_path)
    preprocessor.save(preprocessor_path)
    
    print(f"[Training] Successfully exported trained generator to {generator_path}")
    print(f"[Training] Successfully saved fitted preprocessor to {preprocessor_path}")
    
    # 5. Quick smoke test inference
    generator.eval()
    with torch.no_grad():
        test_z = torch.randn(10, settings.LATENT_DIM, device=device)
        test_c = torch.zeros(10, settings.CONDITION_DIM, device=device)
        test_c[:2, 0] = 1.0  # 2 fraud rows
        gen_feats = generator(test_z, test_c).cpu().numpy()
        synth_df = preprocessor.inverse_transform(gen_feats, test_c.cpu().numpy())
        print(f"[Training] Validation generation successful. Shape: {synth_df.shape}")
        assert synth_df.shape == (10, 31)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train cWGAN-GP for Financial Tabular Data")
    parser.add_argument("--dataset", type=str, default=None, help="Path to creditcard.csv")
    parser.add_argument("--epochs", type=int, default=20, help="Number of training epochs")
    parser.add_argument("--batch-size", type=int, default=64, help="Batch size")
    parser.add_argument("--smoke-test", action="store_true", help="Run rapid smoke test")
    args = parser.parse_args()
    
    train(dataset_path=args.dataset, epochs=args.epochs, batch_size=args.batch_size, smoke_test=args.smoke_test)
