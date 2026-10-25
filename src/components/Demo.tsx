import { useState, useEffect, useMemo } from 'react';
import {
  Download,
  Info,
  Server,
  Cpu,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Search,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Loader2,
} from 'lucide-react';
import { api, type HealthData, type GenerateResponseData, type SyntheticRow } from '@/lib/api';

export default function Demo() {
  const [count, setCount] = useState<number>(1000);
  const [fraudPct, setFraudPct] = useState<number>(5);
  const [seed, setSeed] = useState<number>(42);

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [health, setHealth] = useState<HealthData | null>(null);
  const [connected, setConnected] = useState<boolean>(false);
  const [generationData, setGenerationData] = useState<GenerateResponseData | null>(null);

  // Table State
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sortField, setSortField] = useState<string>('Time');
  const [sortAsc, setSortAsc] = useState<boolean>(true);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [showAllPca, setShowAllPca] = useState<boolean>(false);

  // Check backend health on mount
  useEffect(() => {
    let isMounted = true;
    async function checkBackend() {
      try {
        const res = await api.getHealth();
        if (isMounted) {
          setHealth(res);
          setConnected(true);
        }
      } catch {
        if (isMounted) {
          setConnected(false);
          setHealth(null);
        }
      }
    }
    checkBackend();
    const interval = setInterval(checkBackend, 15000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const handleGenerate = async () => {
    if (count < 1 || count > 50000) {
      setError('Number of transactions must be between 1 and 50,000.');
      return;
    }
    if (fraudPct < 0 || fraudPct > 100) {
      setError('Fraud percentage must be between 0% and 100%.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await api.generate({
        num_rows: count,
        fraud_percentage: fraudPct,
        seed: Number(seed),
      });
      setGenerationData(res);
      setCurrentPage(1);
    } catch (err: any) {
      setError(err.message || 'Generation failed. Please check the backend connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!generationData) return;
    try {
      await api.downloadCSV(generationData.generation_id, `synthetic_transactions_seed${seed}.csv`);
    } catch (err: any) {
      setError(err.message || 'Failed to download CSV');
    }
  };

  const rows = generationData?.rows || [];
  const summary = generationData?.summary;

  // Filtered and sorted rows
  const filteredRows = useMemo(() => {
    if (!searchTerm.trim()) return rows;
    const term = searchTerm.toLowerCase();
    return rows.filter((r) => {
      const isFraudStr = r.Class === 1 ? 'fraud' : 'legit';
      return (
        isFraudStr.includes(term) ||
        r.Amount.toString().includes(term) ||
        r.Time.toString().includes(term)
      );
    });
  }, [rows, searchTerm]);

  const sortedRows = useMemo(() => {
    return [...filteredRows].sort((a, b) => {
      const aVal = a[sortField] ?? 0;
      const bVal = b[sortField] ?? 0;
      if (aVal < bVal) return sortAsc ? -1 : 1;
      if (aVal > bVal) return sortAsc ? 1 : -1;
      return 0;
    });
  }, [filteredRows, sortField, sortAsc]);

  // Pagination
  const totalPages = Math.ceil(sortedRows.length / pageSize) || 1;
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedRows.slice(start, start + pageSize);
  }, [sortedRows, currentPage, pageSize]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  // Amount distribution buckets
  const amountBuckets = useMemo(() => {
    if (rows.length === 0) return [];
    const buckets = [
      { label: '$0 - $20', min: 0, max: 20, count: 0 },
      { label: '$20 - $50', min: 20, max: 50, count: 0 },
      { label: '$50 - $100', min: 50, max: 100, count: 0 },
      { label: '$100 - $250', min: 100, max: 250, count: 0 },
      { label: '$250+', min: 250, max: Infinity, count: 0 },
    ];
    rows.forEach((r) => {
      for (const b of buckets) {
        if (r.Amount >= b.min && r.Amount < b.max) {
          b.count++;
          break;
        }
      }
    });
    const maxCount = Math.max(...buckets.map((b) => b.count), 1);
    return buckets.map((b) => ({
      ...b,
      pct: (b.count / rows.length) * 100,
      barWidth: (b.count / maxCount) * 100,
    }));
  }, [rows]);

  const visibleColumns = useMemo(() => {
    if (showAllPca) {
      return ['Time', 'Amount', 'Class', ...Array.from({ length: 28 }, (_, i) => `V${i + 1}`)];
    }
    return ['Time', 'Amount', 'Class', 'V1', 'V2', 'V3', 'V4'];
  }, [showAllPca]);

  const fraudCount = summary?.fraud_count ?? 0;
  const legitCount = summary?.legitimate_count ?? 0;
  const totalCount = summary?.total_rows ?? rows.length;
  const maxClassBar = Math.max(legitCount, fraudCount, 1);

  return (
    <section id="demo" className="bg-white py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-teal-600">
              Interactive cGAN Generator
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-navy-600 md:text-4xl">
              Synthesize Financial Transactions
            </h2>
          </div>

          {/* Backend Status Pill */}
          <div className="flex items-center gap-2">
            {connected ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700">
                <CheckCircle2 className="h-3.5 w-3.5 text-teal-600" />
                FastAPI Online · {health?.device.toUpperCase()}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
                <AlertTriangle className="h-3.5 w-3.5 text-red-600" />
                Backend Offline (127.0.0.1:8000)
              </span>
            )}
          </div>
        </div>

        {/* Model status alert banner */}
        {connected ? (
          <div className="mt-6 flex items-start gap-3 rounded-xl border border-navy-100 bg-navy-50/50 p-4">
            <Cpu className="mt-0.5 h-5 w-5 shrink-0 text-teal-600" />
            <div className="text-sm text-navy-600">
              <span className="font-semibold text-navy-700">Model Inference Status: </span>
              {health?.artifacts_available ? (
                <span className="text-teal-700 font-medium">
                  Trained cWGAN-GP V2 weights active ({health.model_status}). Synthesized data is produced by neural generator.
                </span>
              ) : (
                <span className="text-amber-800 font-medium">
                  Trained checkpoint not detected. Using statistical simulation pipeline. Run model training to enable PyTorch neural weights.
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="mt-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <Info className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
            <p className="text-sm leading-relaxed text-amber-800">
              <span className="font-semibold">Backend connection required:</span> Start the Python FastAPI server on port 8000 to enable real cWGAN neural synthesis, metric evaluations, and server-side CSV streaming.
            </p>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="mt-4 flex items-center justify-between rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-xs font-semibold text-red-700 hover:underline"
            >
              Dismiss
            </button>
          </div>
        )}

        <div className="mt-8 grid gap-8 lg:grid-cols-[320px_1fr]">
          {/* Controls sidebar */}
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-2xl border border-navy-100 bg-navy-50/40 p-6 shadow-sm">
              <div className="flex items-center justify-between border-b border-navy-100 pb-3">
                <h3 className="text-sm font-semibold text-navy-600">Generation Controls</h3>
                <span className="text-xs text-navy-400">cGAN v2</span>
              </div>

              {/* Number of rows */}
              <div className="mt-5">
                <div className="flex items-center justify-between text-xs font-medium text-navy-400">
                  <label htmlFor="tx-count">Number of transactions</label>
                  <span className="font-semibold text-navy-600 font-mono">{count.toLocaleString()}</span>
                </div>
                <input
                  id="tx-count"
                  type="range"
                  min={100}
                  max={25000}
                  step={100}
                  value={count}
                  onChange={(e) => setCount(Number(e.target.value))}
                  className="mt-2 w-full accent-teal-500"
                />
                <div className="mt-1 flex justify-between text-[10px] text-navy-300 font-mono">
                  <span>100</span>
                  <span>10,000</span>
                  <span>25,000</span>
                </div>
              </div>

              {/* Fraud % */}
              <div className="mt-5">
                <div className="flex items-center justify-between text-xs font-medium text-navy-400">
                  <label htmlFor="tx-fraud">Fraud proportion</label>
                  <span className="font-semibold text-navy-600 font-mono">{fraudPct}%</span>
                </div>
                <input
                  id="tx-fraud"
                  type="range"
                  min={0.1}
                  max={50}
                  step={0.1}
                  value={fraudPct}
                  onChange={(e) => setFraudPct(Number(e.target.value))}
                  className="mt-2 w-full accent-teal-500"
                />
                <div className="mt-1 flex justify-between text-[10px] text-navy-300 font-mono">
                  <span>0.1%</span>
                  <span>25%</span>
                  <span>50%</span>
                </div>
                <p className="mt-1.5 text-[11px] text-navy-300">
                  Requested target condition for synthesizer (benchmark real rate is 0.172%).
                </p>
              </div>

              {/* Random Seed */}
              <div className="mt-5">
                <div className="flex items-center justify-between">
                  <label htmlFor="tx-seed" className="text-xs font-medium text-navy-400">
                    Random Seed
                  </label>
                  <button
                    type="button"
                    onClick={() => setSeed(Math.floor(Math.random() * 100000))}
                    className="flex items-center gap-1 text-[11px] text-teal-600 hover:text-teal-700"
                  >
                    <RotateCcw className="h-2.5 w-2.5" /> Randomize
                  </button>
                </div>
                <input
                  id="tx-seed"
                  type="number"
                  value={seed}
                  onChange={(e) => setSeed(Number(e.target.value))}
                  className="mt-2 w-full rounded-lg border border-navy-100 bg-white px-3 py-2 text-sm font-mono text-navy-600 focus:border-teal-400 focus:outline-none"
                />
                <p className="mt-1 text-[11px] text-navy-300">
                  Deterministic noise seed for reproducible generation.
                </p>
              </div>

              {/* Generate Button */}
              <button
                type="button"
                onClick={handleGenerate}
                disabled={loading}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-teal-500 px-4 py-3 text-sm font-semibold text-navy-800 transition hover:bg-teal-400 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-navy-800" />
                    Generating Synthetics...
                  </>
                ) : (
                  'Generate Transactions'
                )}
              </button>
            </div>
          </aside>

          {/* Output content area */}
          <div>
            {!generationData ? (
              <div className="flex h-full min-h-[380px] flex-col items-center justify-center rounded-2xl border border-dashed border-navy-100 bg-navy-50/20 p-10 text-center">
                <Server className="h-10 w-10 text-navy-200 mb-3" />
                <h4 className="text-base font-semibold text-navy-600">No Transactions Generated Yet</h4>
                <p className="mt-1 max-w-sm text-xs text-navy-400">
                  Configure the transaction volume and fraud percentage on the left, then click{' '}
                  <span className="font-semibold text-teal-600">Generate Transactions</span>.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Generation Metadata Summary Card */}
                {summary && (
                  <div className="rounded-2xl border border-navy-100 bg-navy-50/30 p-5">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-navy-100/60 pb-3">
                      <div>
                        <span className="text-xs uppercase tracking-wider text-navy-400 font-semibold">
                          Generation Overview
                        </span>
                        <div className="text-sm font-semibold text-navy-700">
                          {summary.model_version}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {summary.is_simulation ? (
                          <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800 border border-amber-200">
                            Simulation Mode
                          </span>
                        ) : (
                          <span className="rounded-full bg-teal-100 px-2.5 py-0.5 text-[11px] font-semibold text-teal-800 border border-teal-200">
                            Neural cGAN Inference
                          </span>
                        )}
                        <span className="text-xs font-mono text-navy-400">
                          Seed: {summary.seed}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4 text-center">
                      <div className="rounded-xl bg-white p-3 border border-navy-100/60">
                        <div className="text-[11px] text-navy-400 font-medium">Total Rows</div>
                        <div className="text-lg font-bold text-navy-700 font-mono">
                          {summary.total_rows.toLocaleString()}
                        </div>
                      </div>
                      <div className="rounded-xl bg-white p-3 border border-navy-100/60">
                        <div className="text-[11px] text-navy-400 font-medium">Legitimate</div>
                        <div className="text-lg font-bold text-navy-700 font-mono">
                          {summary.legitimate_count.toLocaleString()}
                        </div>
                      </div>
                      <div className="rounded-xl bg-white p-3 border border-navy-100/60">
                        <div className="text-[11px] text-teal-600 font-medium">Synthetic Fraud</div>
                        <div className="text-lg font-bold text-teal-700 font-mono">
                          {summary.fraud_count.toLocaleString()}
                        </div>
                      </div>
                      <div className="rounded-xl bg-white p-3 border border-navy-100/60">
                        <div className="text-[11px] text-navy-400 font-medium">Actual Share</div>
                        <div className="text-lg font-bold text-navy-700 font-mono">
                          {summary.actual_fraud_percentage}%
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Visualizations: Class Balance & Amount Distribution */}
                <div className="grid gap-6 md:grid-cols-2">
                  {/* Class Balance Card */}
                  <div className="rounded-2xl border border-navy-100 bg-white p-5">
                    <h3 className="text-sm font-semibold text-navy-600">Synthetic Class Balance</h3>
                    <div className="mt-4 space-y-3">
                      <div>
                        <div className="flex justify-between text-xs font-medium">
                          <span className="text-navy-500">Legitimate (Class 0)</span>
                          <span className="text-navy-400 font-mono">
                            {legitCount.toLocaleString()} ({((legitCount / Math.max(totalCount, 1)) * 100).toFixed(1)}%)
                          </span>
                        </div>
                        <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-navy-50">
                          <div
                            className="h-full rounded-full bg-navy-400 transition-all duration-500"
                            style={{ width: `${(legitCount / maxClassBar) * 100}%` }}
                          />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-xs font-medium">
                          <span className="text-teal-700">Fraudulent (Class 1)</span>
                          <span className="text-teal-700 font-mono font-semibold">
                            {fraudCount.toLocaleString()} ({((fraudCount / Math.max(totalCount, 1)) * 100).toFixed(1)}%)
                          </span>
                        </div>
                        <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-navy-50">
                          <div
                            className="h-full rounded-full bg-teal-500 transition-all duration-500"
                            style={{ width: `${(fraudCount / maxClassBar) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Amount Distribution Card */}
                  <div className="rounded-2xl border border-navy-100 bg-white p-5">
                    <h3 className="text-sm font-semibold text-navy-600">Transaction Amount Distribution</h3>
                    <div className="mt-3 space-y-2">
                      {amountBuckets.map((bucket) => (
                        <div key={bucket.label}>
                          <div className="flex justify-between text-[11px] font-medium text-navy-500">
                            <span>{bucket.label}</span>
                            <span className="font-mono text-navy-400">
                              {bucket.count} ({bucket.pct.toFixed(1)}%)
                            </span>
                          </div>
                          <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-navy-50">
                            <div
                              className="h-full rounded-full bg-teal-400 transition-all duration-500"
                              style={{ width: `${bucket.barWidth}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Generated Data Table */}
                <div className="overflow-hidden rounded-2xl border border-navy-100 bg-white shadow-sm">
                  {/* Table Toolbar */}
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-navy-100 bg-navy-50/40 px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <Search className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-navy-300" />
                        <input
                          type="text"
                          placeholder="Search transactions..."
                          value={searchTerm}
                          onChange={(e) => {
                            setSearchTerm(e.target.value);
                            setCurrentPage(1);
                          }}
                          className="h-8 rounded-lg border border-navy-100 bg-white pl-8 pr-3 text-xs text-navy-600 placeholder:text-navy-300 focus:border-teal-400 focus:outline-none"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowAllPca(!showAllPca)}
                        className="rounded-lg border border-navy-100 bg-white px-2.5 py-1.5 text-xs font-medium text-navy-500 hover:text-navy-700"
                      >
                        {showAllPca ? 'Hide V5-V28' : 'Show All 28 PCA Columns'}
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={handleDownload}
                      className="inline-flex items-center gap-2 rounded-lg bg-white border border-navy-100 px-3 py-1.5 text-xs font-semibold text-navy-700 transition hover:border-teal-400 hover:text-teal-700 shadow-sm"
                    >
                      <Download className="h-3.5 w-3.5" /> Download Full CSV
                    </button>
                  </div>

                  {/* Responsive Table */}
                  <div className="scrollbar-slim overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-navy-100 bg-navy-50/20 text-[11px] uppercase tracking-wide text-navy-400">
                          <th className="px-4 py-3 font-semibold">#</th>
                          {visibleColumns.map((col) => (
                            <th
                              key={col}
                              onClick={() => handleSort(col)}
                              className="cursor-pointer px-4 py-3 font-semibold hover:text-navy-700"
                            >
                              <span className="flex items-center gap-1">
                                {col}
                                <ArrowUpDown className="h-3 w-3 text-navy-300" />
                              </span>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-navy-50">
                        {paginatedRows.length === 0 ? (
                          <tr>
                            <td
                              colSpan={visibleColumns.length + 1}
                              className="px-4 py-8 text-center text-xs text-navy-400"
                            >
                              No matching transactions found.
                            </td>
                          </tr>
                        ) : (
                          paginatedRows.map((r, i) => {
                            const rowIndex = (currentPage - 1) * pageSize + i + 1;
                            const isFraud = r.Class === 1;
                            return (
                              <tr
                                key={rowIndex}
                                className={`transition hover:bg-navy-50/40 ${
                                  isFraud ? 'bg-amber-50/30' : ''
                                }`}
                              >
                                <td className="px-4 py-2 text-xs font-mono text-navy-300">
                                  {rowIndex}
                                </td>
                                {visibleColumns.map((col) => {
                                  const val = r[col];
                                  if (col === 'Class') {
                                    return (
                                      <td key={col} className="px-4 py-2">
                                        {isFraud ? (
                                          <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                                            Fraud
                                          </span>
                                        ) : (
                                          <span className="inline-flex rounded-full bg-teal-50 px-2 py-0.5 text-[10px] font-semibold text-teal-700">
                                            Legitimate
                                          </span>
                                        )}
                                      </td>
                                    );
                                  }
                                  if (col === 'Amount') {
                                    return (
                                      <td
                                        key={col}
                                        className="px-4 py-2 font-mono text-xs font-semibold text-navy-700"
                                      >
                                        ${val?.toFixed(2)}
                                      </td>
                                    );
                                  }
                                  if (col === 'Time') {
                                    return (
                                      <td
                                        key={col}
                                        className="px-4 py-2 font-mono text-xs text-navy-400"
                                      >
                                        {val?.toFixed(0)}s
                                      </td>
                                    );
                                  }
                                  return (
                                    <td
                                      key={col}
                                      className="px-4 py-2 font-mono text-xs text-navy-500"
                                    >
                                      {typeof val === 'number' ? val.toFixed(4) : val}
                                    </td>
                                  );
                                })}
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination Footer */}
                  <div className="flex flex-wrap items-center justify-between border-t border-navy-100 bg-white px-5 py-3 text-xs text-navy-400">
                    <div className="flex items-center gap-2">
                      <span>Rows per page:</span>
                      <select
                        value={pageSize}
                        onChange={(e) => {
                          setPageSize(Number(e.target.value));
                          setCurrentPage(1);
                        }}
                        className="rounded border border-navy-100 px-2 py-1 text-xs text-navy-600 focus:outline-none"
                      >
                        <option value={10}>10</option>
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                      </select>
                      <span>
                        Showing {paginatedRows.length} of {sortedRows.length} rows
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="rounded border border-navy-100 p-1.5 hover:bg-navy-50 disabled:opacity-40"
                      >
                        <ChevronLeft className="h-3.5 w-3.5" />
                      </button>
                      <span className="font-mono text-navy-600">
                        Page {currentPage} of {totalPages}
                      </span>
                      <button
                        type="button"
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="rounded border border-navy-100 p-1.5 hover:bg-navy-50 disabled:opacity-40"
                      >
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
