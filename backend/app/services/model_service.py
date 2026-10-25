import os
from pathlib import Path
from typing import Optional, Tuple
import numpy as np
import torch
import torch.nn as nn
from app.config import settings
from app.utils.preprocessing import TabularPreprocessor

class ResidualBlock(nn.Module):
    """
    Residual block with 256 hidden units and LayerNorm + LeakyReLU.
    Matches specification: 2 residual blocks with 256 hidden units.
    """
    def __init__(self, hidden_dim: int = 256):
        super().__init__()
        self.fc1 = nn.Linear(hidden_dim, hidden_dim)
        self.ln1 = nn.LayerNorm(hidden_dim)
        self.act1 = nn.LeakyReLU(0.2, inplace=True)
        self.fc2 = nn.Linear(hidden_dim, hidden_dim)
        self.ln2 = nn.LayerNorm(hidden_dim)
        self.act2 = nn.LeakyReLU(0.2, inplace=True)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        residual = x
        out = self.fc1(x)
        out = self.ln1(out)
        out = self.act1(out)
        out = self.fc2(out)
        out = self.ln2(out)
        out = self.act2(out + residual)
        return out

class ConditionalGenerator(nn.Module):
    """
    Conditional Generator:
      - 128-dim latent noise vector z
      - 5-dim condition vector c (Class + Amount quartile)
      - Total input: 133 dims
      - Projection to 256 units
      - 2 Residual blocks of 256 units
      - Final projection to 31 output dims with Tanh activation [-1, 1]
    """
    def __init__(
        self,
        latent_dim: int = 128,
        condition_dim: int = 5,
        hidden_dim: int = 256,
        num_res_blocks: int = 2,
        output_dim: int = 31
    ):
        super().__init__()
        self.latent_dim = latent_dim
        self.condition_dim = condition_dim
        self.output_dim = output_dim

        self.input_layer = nn.Sequential(
            nn.Linear(latent_dim + condition_dim, hidden_dim),
            nn.LeakyReLU(0.2, inplace=True)
        )
        self.res_blocks = nn.ModuleList([
            ResidualBlock(hidden_dim) for _ in range(num_res_blocks)
        ])
        self.output_layer = nn.Sequential(
            nn.Linear(hidden_dim, output_dim),
            nn.Tanh()
        )

    def forward(self, z: torch.Tensor, c: torch.Tensor) -> torch.Tensor:
        inputs = torch.cat([z, c], dim=1)
        h = self.input_layer(inputs)
        for block in self.res_blocks:
            h = block(h)
        return self.output_layer(h)

class ConditionalCritic(nn.Module):
    """
    Critic (Discriminator) with support for PacGAN packing (e.g. pac=10) and WGAN-GP.
    """
    def __init__(
        self,
        feature_dim: int = 31,
        condition_dim: int = 5,
        hidden_dim: int = 256,
        pac: int = 1
    ):
        super().__init__()
        self.pac = pac
        in_dim = (feature_dim + condition_dim) * pac
        self.net = nn.Sequential(
            nn.Linear(in_dim, hidden_dim),
            nn.LeakyReLU(0.2, inplace=True),
            nn.Linear(hidden_dim, hidden_dim // 2),
            nn.LeakyReLU(0.2, inplace=True),
            nn.Linear(hidden_dim // 2, 1)
        )

    def forward(self, x: torch.Tensor, c: torch.Tensor) -> torch.Tensor:
        xc = torch.cat([x, c], dim=1)
        if self.pac > 1:
            batch_size = xc.size(0)
            if batch_size % self.pac != 0:
                pad_size = self.pac - (batch_size % self.pac)
                xc = torch.cat([xc, xc[:pad_size]], dim=0)
            xc = xc.view(-1, xc.size(1) * self.pac)
        return self.net(xc)

class ModelService:
    """
    Singleton service managing model checkpoints, inference, device selection,
    and preprocessor state.
    """
    _instance: Optional["ModelService"] = None

    def __init__(self):
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.generator: Optional[ConditionalGenerator] = None
        self.preprocessor: TabularPreprocessor = TabularPreprocessor()
        self.is_trained: bool = False
        self.model_type: str = "uninitialized"
        self._load_artifacts()

    @classmethod
    def get_instance(cls) -> "ModelService":
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def _load_artifacts(self) -> None:
        """Attempts to load trained generator weights and fitted preprocessor."""
        model_dir = settings.MODEL_DIR
        checkpoint_path = model_dir / settings.CHECKPOINT_NAME
        preprocessor_path = model_dir / "preprocessor.json"

        # Load preprocessor if exists
        if preprocessor_path.exists():
            try:
                self.preprocessor = TabularPreprocessor.load(preprocessor_path)
            except Exception as e:
                print(f"[ModelService] Failed to load preprocessor: {e}")

        # Check for trained generator weights
        if checkpoint_path.exists():
            try:
                gen = ConditionalGenerator(
                    latent_dim=settings.LATENT_DIM,
                    condition_dim=settings.CONDITION_DIM,
                    hidden_dim=settings.HIDDEN_UNITS,
                    num_res_blocks=settings.NUM_RES_BLOCKS,
                    output_dim=settings.FEATURE_DIM
                ).to(self.device)

                state_dict = torch.load(checkpoint_path, map_location=self.device)
                # Verify state dict keys match
                gen.load_state_dict(state_dict)
                gen.eval()
                for param in gen.parameters():
                    param.requires_grad = False

                self.generator = gen
                self.is_trained = True
                self.model_type = "trained_cwgan_gp"
                print(f"[ModelService] Successfully loaded trained generator from {checkpoint_path}")
            except Exception as e:
                print(f"[ModelService] Checkpoint exists but failed to load safely: {e}")
                self.is_trained = False
                self.generator = None
                self.model_type = "corrupted_checkpoint"
        else:
            self.is_trained = False
            self.generator = None
            self.model_type = "missing_checkpoint"

    def initialize_generator(self, weights_path: Optional[Path] = None) -> ConditionalGenerator:
        """Creates and initializes a new generator model."""
        gen = ConditionalGenerator(
            latent_dim=settings.LATENT_DIM,
            condition_dim=settings.CONDITION_DIM,
            hidden_dim=settings.HIDDEN_UNITS,
            num_res_blocks=settings.NUM_RES_BLOCKS,
            output_dim=settings.FEATURE_DIM
        ).to(self.device)
        if weights_path and weights_path.exists():
            state = torch.load(weights_path, map_location=self.device)
            gen.load_state_dict(state)
        gen.eval()
        return gen

    def generate_features(
        self,
        z: torch.Tensor,
        c: torch.Tensor
    ) -> torch.Tensor:
        """
        Runs inference on generator. Gradient calculation disabled.
        """
        if self.generator is None:
            raise RuntimeError("Generator model is not loaded. Train or provide trained weights.")
        with torch.no_grad():
            z = z.to(self.device)
            c = c.to(self.device)
            return self.generator(z, c)
