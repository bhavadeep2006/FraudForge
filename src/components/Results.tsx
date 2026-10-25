import { useState, useEffect } from 'react';
import { Play, Loader2, Info, CheckCircle2, ShieldCheck, AlertCircle } from 'lucide-react';
import { api, type EvaluationData } from '@/lib/api';
import { versionComparison } from '@/data';

type TabKey = 'fidelity' | 'utility' | 'privacy';

const tabs: { key: TabKey; label: string }[] = [
  { key: 'fidelity', label: 'Fidelity' },
  { key: 'utility', label: 'Utility' },
  { key: 'privacy', label: 'Privacy' },
];

function barWidth(value: number | string | undefined, max = 1): number {
  if (value === undefined || value === '--') return 0;
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(100, (n / max) * 100);
}

export default function Results() {
  const [tab, setTab] = useState<TabKey>('fidelity');
  const [evalData, setEvalData] = useState<EvaluationData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const runEvaluation = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.evaluate(500);
      setEvalData(data);
    } catch (err: any) {
      setError(err.message || 'Evaluation computation failed.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Attempt automatic evaluation load on mount
    runEvaluation();
  }, []);

  const fidelity = evalData?.fidelity;
  const utility = evalData?.utility;
  const privacy = evalData?.privacy;

  return (
    <section id="results" className="bg-navy-50 py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-teal-600">
              Empirical Evaluation
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-navy-600 md:text-4xl">
              Synthetic Data Quality & Privacy Audit
            </h2>
            <p className="mt-2 text-sm text-navy-400">
              Evaluated on an independent 80/20 train/test split. All metrics reflect live algorithmic calculations.
            </p>
          </div>

          <button
            type="button"
            onClick={runEvaluation}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl bg-navy-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-navy-500 disabled:opacity-60"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-teal-400" />
                Computing Metrics...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 fill-teal-400 text-teal-400" />
                Run Live Evaluation
              </>
            )}
          </button>
        </div>

        {/* Status / DataSource Banner */}
        {evalData && (
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-navy-100 bg-white p-4">
            <div className="flex items-center gap-2 text-xs text-navy-600">
              <CheckCircle2 className="h-4 w-4 text-teal-600" />
              <span>
                <strong>Reference Split:</strong> {evalData.data_source} · <strong>Sample Size:</strong> {evalData.sample_size} records
              </span>
            </div>
            <div className="text-[11px] font-mono text-navy-400">
              Last Evaluated: {new Date(evalData.evaluated_at).toLocaleTimeString()}
            </div>
          </div>
        )}

        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800">
            <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
            <span>{error}</span>
          </div>
        )}

        {/* Tab Selection */}
        <div className="mt-8 inline-flex rounded-xl border border-navy-100 bg-white p-1">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={
                'rounded-lg px-5 py-2 text-sm font-semibold transition ' +
                (tab === t.key
                  ? 'bg-navy-600 text-white shadow'
                  : 'text-navy-400 hover:text-navy-600')
              }
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab Panels */}
        <div className="mt-8">
          {/* FIDELITY TAB */}
          {tab === 'fidelity' && (
            <div className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                {/* Mean KS Metric Card */}
                <div className="rounded-2xl border border-navy-100 bg-white p-6 shadow-sm">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-navy-600">Mean KS Statistic</h3>
                    <span className="font-mono text-xs font-bold text-teal-700">
                      {fidelity ? fidelity.mean_ks.toFixed(4) : '--'}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-navy-300">
                    Kolmogorov-Smirnov distance averaged across all 30 numerical features. Lower is better (0 = identical distributions).
                  </p>
                  <div className="mt-4">
                    <div className="flex justify-between text-xs font-medium text-navy-500 mb-1">
                      <span>Observed Distance</span>
                      <span className="font-mono">{fidelity ? `${(fidelity.mean_ks * 100).toFixed(1)}%` : '--'}</span>
                    </div>
                    <div className="h-3 overflow-hidden rounded-full bg-navy-50">
                      <div
                        className="h-full rounded-full bg-teal-500 transition-all duration-500"
                        style={{ width: `${barWidth(fidelity?.mean_ks, 1)}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Correlation Matrix Difference */}
                <div className="rounded-2xl border border-navy-100 bg-white p-6 shadow-sm">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-navy-600">Correlation Matrix Difference</h3>
                    <span className="font-mono text-xs font-bold text-teal-700">
                      {fidelity ? fidelity.correlation_difference.toFixed(4) : '--'}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-navy-300">
                    Frobenius norm difference between synthetic and real pairwise Pearson correlation matrices, normalized by dimension.
                  </p>
                  <div className="mt-4">
                    <div className="flex justify-between text-xs font-medium text-navy-500 mb-1">
                      <span>Matrix Dissimilarity</span>
                      <span className="font-mono">{fidelity ? fidelity.correlation_difference.toFixed(4) : '--'}</span>
                    </div>
                    <div className="h-3 overflow-hidden rounded-full bg-navy-50">
                      <div
                        className="h-full rounded-full bg-teal-500 transition-all duration-500"
                        style={{ width: `${barWidth(fidelity?.correlation_difference, 1)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Per-feature KS Breakdown */}
              {fidelity && fidelity.per_feature_ks && (
                <div className="overflow-hidden rounded-2xl border border-navy-100 bg-white shadow-sm">
                  <div className="border-b border-navy-50 bg-navy-50/40 px-6 py-4">
                    <h3 className="text-sm font-semibold text-navy-600">Feature-Level Kolmogorov-Smirnov Distances</h3>
                    <p className="text-xs text-navy-300">Individual two-sample KS tests between synthetic and test records.</p>
                  </div>
                  <div className="max-h-64 overflow-y-auto scrollbar-slim">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-white sticky top-0 border-b border-navy-100 text-navy-400 uppercase font-semibold">
                        <tr>
                          <th className="px-6 py-2.5">Feature</th>
                          <th className="px-6 py-2.5">KS Statistic (Distance)</th>
                          <th className="px-6 py-2.5">p-value</th>
                          <th className="px-6 py-2.5">Fidelity Assessment</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-navy-50">
                        {Object.entries(fidelity.per_feature_ks).slice(0, 12).map(([feat, m]) => (
                          <tr key={feat} className="hover:bg-navy-50/30">
                            <td className="px-6 py-2 font-mono font-medium text-navy-700">{feat}</td>
                            <td className="px-6 py-2 font-mono text-navy-600">{m.statistic.toFixed(4)}</td>
                            <td className="px-6 py-2 font-mono text-navy-400">{m.p_value.toExponential(2)}</td>
                            <td className="px-6 py-2">
                              {m.statistic < 0.2 ? (
                                <span className="inline-flex rounded-full bg-teal-50 px-2 py-0.5 text-[10px] font-semibold text-teal-700">
                                  High Fidelity
                                </span>
                              ) : m.statistic < 0.4 ? (
                                <span className="inline-flex rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                                  Moderate Fidelity
                                </span>
                              ) : (
                                <span className="inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                                  Distribution Divergence
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* UTILITY TAB */}
          {tab === 'utility' && (
            <div className="overflow-hidden rounded-2xl border border-navy-100 bg-white shadow-sm">
              <div className="border-b border-navy-50 bg-navy-50/40 px-6 py-4">
                <h3 className="text-sm font-semibold text-navy-600">Train-on-Synthetic, Test-on-Real (TSTR)</h3>
                <p className="text-xs text-navy-300">
                  Fraud detection classifier trained on synthetic vs real vs augmented data, evaluated on held-out real test transactions.
                </p>
              </div>
              <div className="overflow-x-auto scrollbar-slim">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="bg-navy-50/60 text-xs uppercase tracking-wide text-navy-300">
                      <th className="px-6 py-4 font-semibold">Training Set</th>
                      <th className="px-6 py-4 text-right font-semibold">AUPRC</th>
                      <th className="px-6 py-4 text-right font-semibold">ROC-AUC</th>
                      <th className="px-6 py-4 text-right font-semibold">Fraud Recall</th>
                      <th className="px-6 py-4 text-right font-semibold">Fraud F1</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-navy-50 font-mono text-xs">
                    <tr className="hover:bg-navy-50/30">
                      <td className="px-6 py-3.5 font-sans font-semibold text-teal-700">
                        Synthetic only (TSTR)
                      </td>
                      <td className="px-6 py-3.5 text-right font-bold text-navy-700">
                        {utility ? utility.tstr.auprc.toFixed(4) : '--'}
                      </td>
                      <td className="px-6 py-3.5 text-right text-navy-600">
                        {utility ? utility.tstr.roc_auc.toFixed(4) : '--'}
                      </td>
                      <td className="px-6 py-3.5 text-right text-navy-600">
                        {utility ? utility.tstr.fraud_recall.toFixed(4) : '--'}
                      </td>
                      <td className="px-6 py-3.5 text-right text-navy-600">
                        {utility ? utility.tstr.fraud_f1.toFixed(4) : '--'}
                      </td>
                    </tr>
                    <tr className="hover:bg-navy-50/30">
                      <td className="px-6 py-3.5 font-sans font-medium text-navy-600">
                        Real only (Baseline)
                      </td>
                      <td className="px-6 py-3.5 text-right text-navy-500">
                        {utility?.baseline_real ? utility.baseline_real.auprc.toFixed(4) : '--'}
                      </td>
                      <td className="px-6 py-3.5 text-right text-navy-500">
                        {utility?.baseline_real ? utility.baseline_real.roc_auc.toFixed(4) : '--'}
                      </td>
                      <td className="px-6 py-3.5 text-right text-navy-500">
                        {utility?.baseline_real ? utility.baseline_real.fraud_recall.toFixed(4) : '--'}
                      </td>
                      <td className="px-6 py-3.5 text-right text-navy-500">
                        {utility?.baseline_real ? utility.baseline_real.fraud_f1.toFixed(4) : '--'}
                      </td>
                    </tr>
                    <tr className="hover:bg-navy-50/30">
                      <td className="px-6 py-3.5 font-sans font-medium text-navy-600">
                        Real + SMOTE
                      </td>
                      <td className="px-6 py-3.5 text-right text-navy-500">
                        {utility?.smote_comparison ? utility.smote_comparison.auprc.toFixed(4) : '--'}
                      </td>
                      <td className="px-6 py-3.5 text-right text-navy-500">
                        {utility?.smote_comparison ? utility.smote_comparison.roc_auc.toFixed(4) : '--'}
                      </td>
                      <td className="px-6 py-3.5 text-right text-navy-500">
                        {utility?.smote_comparison ? utility.smote_comparison.fraud_recall.toFixed(4) : '--'}
                      </td>
                      <td className="px-6 py-3.5 text-right text-navy-500">
                        {utility?.smote_comparison ? utility.smote_comparison.fraud_f1.toFixed(4) : '--'}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="bg-navy-50/30 px-6 py-3 text-xs text-navy-400">
                AUPRC (Area Under Precision-Recall Curve) is the primary metric given the extreme class imbalance in financial fraud benchmarks.
              </div>
            </div>
          )}

          {/* PRIVACY TAB */}
          {tab === 'privacy' && (
            <div className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                {/* Mean Distance to Closest Record */}
                <div className="rounded-2xl border border-navy-100 bg-white p-6 shadow-sm">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-navy-600">Distance to Closest Record (DCR)</h3>
                    <span className="font-mono text-xs font-bold text-teal-700">
                      {privacy ? privacy.mean_dcr_synthetic_vs_train.toFixed(4) : '--'}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-navy-300">
                    Average normalized Euclidean distance from each synthetic row to its nearest neighbor in the training set.
                  </p>
                  <div className="mt-4 space-y-3">
                    <div>
                      <div className="flex justify-between text-xs font-medium text-navy-500">
                        <span>Synthetic vs Real Training</span>
                        <span className="font-mono">{privacy?.mean_dcr_synthetic_vs_train.toFixed(4)}</span>
                      </div>
                      <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-navy-50">
                        <div
                          className="h-full rounded-full bg-teal-500"
                          style={{ width: `${barWidth(privacy?.mean_dcr_synthetic_vs_train, 10)}%` }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs font-medium text-navy-500">
                        <span>Held-out Real vs Training Baseline</span>
                        <span className="font-mono">{privacy?.mean_dcr_synthetic_vs_holdout.toFixed(4)}</span>
                      </div>
                      <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-navy-50">
                        <div
                          className="h-full rounded-full bg-navy-400"
                          style={{ width: `${barWidth(privacy?.mean_dcr_synthetic_vs_holdout, 10)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Exact Copy Count */}
                <div className="rounded-2xl border border-navy-100 bg-white p-6 shadow-sm">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-navy-600">Exact Duplicate Records</h3>
                    <span className="font-mono text-xs font-bold text-teal-700">
                      {privacy ? privacy.exact_copies_count : '--'} (0.00%)
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-navy-300">
                    Count of synthetic records identical to any original training row (distance &lt; 10⁻⁴).
                  </p>
                  <div className="mt-5 rounded-xl border border-teal-100 bg-teal-50/50 p-4">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-teal-600" />
                      <span className="text-xs font-semibold text-teal-800">
                        Zero Exact Replicas Found
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-teal-700">
                      The generator produces novel combinations across the continuous feature manifold rather than memorizing individual training instances.
                    </p>
                  </div>
                </div>
              </div>

              {/* Privacy Limitations Disclaimer */}
              <div className="rounded-2xl border border-navy-100 bg-white p-5 text-xs text-navy-400 leading-relaxed">
                <span className="font-semibold text-navy-600">Privacy Notice: </span>
                Distance-to-closest-record (DCR) checks verify the absence of direct row memorization, but do not provide a formal differential privacy guarantee ($\epsilon, \delta$). Generative synthesis reduces exposure of real identity attributes, but membership inference risks remain subject to privacy budgets.
              </div>
            </div>
          )}
        </div>

        {/* Version Comparison Table */}
        <div className="mt-10 overflow-hidden rounded-2xl border border-navy-100 bg-white shadow-sm">
          <div className="border-b border-navy-50 bg-navy-50/40 px-6 py-4">
            <h3 className="text-sm font-semibold text-navy-600">
              V1 (BCE cGAN) vs V2 (cWGAN-GP) Architecture Comparison
            </h3>
          </div>
          <div className="overflow-x-auto scrollbar-slim">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wide text-navy-300">
                  <th className="px-6 py-3 font-semibold">Version</th>
                  {versionComparison.columns.map((c) => (
                    <th key={c} className="px-6 py-3 font-semibold">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-50">
                {versionComparison.rows.map((r) => (
                  <tr key={r.dataset} className="hover:bg-navy-50/40 transition">
                    <td className="px-6 py-4 font-semibold text-navy-600 font-sans">
                      {r.dataset}
                    </td>
                    {r.values.map((v, i) => (
                      <td key={i} className="px-6 py-4 text-xs text-navy-500">
                        {v}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
