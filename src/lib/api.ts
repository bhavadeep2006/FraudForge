// Centralized API client for communicating with the FastAPI backend

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export interface HealthData {
  status: string;
  model_status: string;
  backend_version: string;
  device: string;
  artifacts_available: boolean;
  dataset_available: boolean;
}

export interface ModelInfo {
  architecture: string;
  latent_dim: number;
  condition_dim: number;
  hidden_units: number;
  num_res_blocks: number;
  feature_dim: number;
  output_schema: string[];
  artifacts_loaded: boolean;
  device: string;
  description: string;
}

export interface DatasetInfo {
  available: boolean;
  path: string;
  total_rows?: number;
  fraud_rows?: number;
  legitimate_rows?: number;
  fraud_percentage?: number;
  features: string[];
  message: string;
}

export interface GenerationSummary {
  total_rows: number;
  fraud_count: number;
  legitimate_count: number;
  requested_fraud_percentage: number;
  actual_fraud_percentage: number;
  seed: number;
  generated_at: string;
  model_version: string;
  is_simulation: boolean;
}

export interface SyntheticRow {
  Time: number;
  Amount: number;
  Class: 0 | 1;
  [key: string]: number;
}

export interface GenerateResponseData {
  generation_id: string;
  summary: GenerationSummary;
  columns: string[];
  rows: SyntheticRow[];
  total_count: number;
}

export interface KSMetric {
  statistic: number;
  p_value: number;
}

export interface FidelityMetrics {
  mean_ks: number;
  correlation_difference: number;
  per_feature_ks: Record<string, KSMetric>;
}

export interface TSTRMetrics {
  auprc: number;
  roc_auc: number;
  fraud_recall: number;
  fraud_f1: number;
}

export interface UtilityMetrics {
  tstr: TSTRMetrics;
  baseline_real?: TSTRMetrics;
  smote_comparison?: TSTRMetrics;
}

export interface PrivacyMetrics {
  mean_dcr_synthetic_vs_train: number;
  mean_dcr_synthetic_vs_holdout: number;
  min_dcr: number;
  exact_copies_count: number;
  exact_copies_percentage: number;
}

export interface EvaluationData {
  evaluation_id: string;
  evaluated_at: string;
  data_source: string;
  sample_size: number;
  fidelity: FidelityMetrics;
  utility: UtilityMetrics;
  privacy: PrivacyMetrics;
  limitations: string[];
  notes: string;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${path}`;
  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options?.headers || {}),
      },
    });

    if (!res.ok) {
      let errorMsg = `Server error ${res.status}: ${res.statusText}`;
      try {
        const errorJson = await res.json();
        if (errorJson.detail) {
          errorMsg = Array.isArray(errorJson.detail)
            ? errorJson.detail.map((e: any) => e.msg).join(', ')
            : errorJson.detail;
        }
      } catch {
        // fallback to status text
      }
      throw new Error(errorMsg);
    }

    return (await res.json()) as T;
  } catch (err: any) {
    if (err.name === 'TypeError' && err.message.includes('fetch')) {
      throw new Error(`Cannot connect to backend server at ${API_BASE_URL}. Ensure the FastAPI server is running.`);
    }
    throw err;
  }
}

export const api = {
  async getHealth(): Promise<HealthData> {
    return request<HealthData>('/api/health');
  },

  async getModelInfo(): Promise<ModelInfo> {
    return request<ModelInfo>('/api/model/info');
  },

  async getDatasetInfo(): Promise<DatasetInfo> {
    return request<DatasetInfo>('/api/dataset/info');
  },

  async generate(params: { num_rows: number; fraud_percentage: number; seed?: number }): Promise<GenerateResponseData> {
    return request<GenerateResponseData>('/api/generate', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  async getGeneration(id: string): Promise<GenerateResponseData> {
    return request<GenerateResponseData>(`/api/generations/${id}`);
  },

  async evaluate(sampleSize = 1000, generationId?: string): Promise<EvaluationData> {
    return request<EvaluationData>('/api/evaluate', {
      method: 'POST',
      body: JSON.stringify({ sample_size: sampleSize, generation_id: generationId }),
    });
  },

  getExportUrl(generationId: string): string {
    return `${API_BASE_URL}/api/export/${generationId}`;
  },

  async downloadCSV(generationId: string, filename = 'synthetic_transactions.csv'): Promise<void> {
    const url = this.getExportUrl(generationId);
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error('Failed to download CSV from backend.');
    }
    const blob = await res.blob();
    const downloadUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(downloadUrl);
  },
};
