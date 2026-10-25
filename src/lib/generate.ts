// Seeded browser sampler. This is a simple statistical sampler used only to
// illustrate the interface — the trained PyTorch generator runs in Streamlit.

export interface SampledRow {
  Amount: number;
  Hour: number;
  V1: number;
  V2: number;
  V3: number;
  Class: 0 | 1;
}

// mulberry32 PRNG
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Box-Muller gaussian from a uniform PRNG
function gaussian(rand: () => number, mean: number, std: number): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = rand();
  while (v === 0) v = rand();
  return mean + std * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function logNormal(rand: () => number, mu: number, sigma: number): number {
  return Math.exp(gaussian(rand, mu, sigma));
}

export interface GenerateArgs {
  count: number;
  fraudSharePct: number;
  seed: number;
}

export function generateRows({ count, fraudSharePct, seed }: GenerateArgs): SampledRow[] {
  const rand = mulberry32(seed);
  const fraudCount = Math.round((fraudSharePct / 100) * count);
  const rows: SampledRow[] = [];

  for (let i = 0; i < count; i++) {
    const isFraud = i < fraudCount ? 1 : 0;
    // Fraud rows tend to have higher, more variable amounts.
    const amount = isFraud
      ? logNormal(rand, Math.log(180), 1.4)
      : logNormal(rand, Math.log(80), 0.9);
    const hour = Math.floor(rand() * 24);

    // Distinct V-feature distributions per class to mimic learned separation.
    const v1 = gaussian(rand, isFraud ? -1.2 : 0.4, isFraud ? 2.4 : 1.0);
    const v2 = gaussian(rand, isFraud ? 0.9 : -0.2, isFraud ? 1.8 : 1.1);
    const v3 = gaussian(rand, isFraud ? -0.8 : 0.1, isFraud ? 1.6 : 0.9);

    rows.push({
      Amount: Math.round(amount * 100) / 100,
      Hour: hour,
      V1: Math.round(v1 * 1000) / 1000,
      V2: Math.round(v2 * 1000) / 1000,
      V3: Math.round(v3 * 1000) / 1000,
      Class: isFraud as 0 | 1,
    });
  }

  // Shuffle so fraud isn't clustered at the top.
  for (let i = rows.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [rows[i], rows[j]] = [rows[j], rows[i]];
  }
  return rows;
}

export function toCSV(rows: SampledRow[]): string {
  const header = 'Amount,Hour,V1,V2,V3,Class';
  const body = rows.map((r) => [r.Amount, r.Hour, r.V1, r.V2, r.V3, r.Class].join(','));
  return [header, ...body].join('\n');
}
