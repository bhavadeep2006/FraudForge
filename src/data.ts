// Central content store. Edit values here to update the whole site.

export const links = {
  streamlit: 'https://your-streamlit-app.example.com',
  github: 'https://github.com/your-handle/tabular-synthesizer-finance',
};

export const hero = {
  title: 'Tabular Data Synthesizer for Finance',
  subtitle:
    'Conditional GAN that generates synthetic transaction data for fraud-detection models, without exposing real customer data',
  meta: 'B.Tech III Year, Dept. of CSE (AI & ML), 2026-2027',
};

export const problems = [
  {
    icon: 'shield',
    title: 'Privacy',
    body: 'Real customer transaction records are protected by laws such as GDPR and cannot be shared freely across teams, regions, or researchers.',
  },
  {
    icon: 'scale',
    title: 'Imbalance',
    body: 'Only 492 of 284,807 transactions (0.172%) are fraud in the benchmark dataset, leaving models with very few minority-class examples to learn from.',
  },
  {
    icon: 'layers',
    title: 'Limits of SMOTE',
    body: 'SMOTE only interpolates between existing fraud rows, so it cannot create genuinely new fraud patterns or capture the true data distribution.',
  },
];

export const howItWorks = {
  steps: [
    { label: 'Real data', detail: 'Creditcard transactions (PCA + Amount, Time, Class)' },
    { label: 'Preprocessing', detail: 'Quantile scaling to [-1, 1]' },
    { label: 'Conditional GAN', detail: 'Generator + critic, WGAN-GP' },
    { label: 'Synthetic table', detail: 'New rows conditioned on class & amount tier' },
    { label: 'Evaluation', detail: 'Fidelity, utility, privacy' },
  ],
  paragraph:
    'The generator takes 128-dim noise + a 5-dim condition (class + amount tier), uses 2 residual blocks of 256 units, and a Tanh output. The critic uses PacGAN packing (pac=10).',
};

export const techStack = [
  'Python',
  'PyTorch',
  'scikit-learn',
  'pandas',
  'Streamlit',
  'Google Colab (Tesla T4)',
];

export const limitations = [
  'PCA features have no direct business meaning',
  'Numeric features only — no categorical schemas',
  'Trained on only 492 fraud rows',
  'No formal differential privacy / DP-SGD',
];

export const futureScope = [
  'Categorical and mixed-type schemas',
  'Customer-level sequential modelling',
  'Membership-inference privacy tests',
  'DP-SGD with formal privacy budgets',
];

// Result numbers — placeholders ("--") so you can fill them in later.

export const fidelity = [
  { metric: 'Mean KS statistic', v1: '--', v2: '--', max: 1 },
  { metric: 'Correlation difference', v1: '--', v2: '--', max: 1 },
];

export const utilityTable = {
  columns: ['AUPRC', 'ROC-AUC', 'Fraud recall', 'Fraud F1'],
  rows: [
    { dataset: 'Real only', values: ['--', '--', '--', '--'] },
    { dataset: 'Synthetic only (TSTR)', values: ['--', '--', '--', '--'] },
    { dataset: 'Real + SMOTE', values: ['--', '--', '--', '--'] },
    { dataset: 'Real + cGAN', values: ['--', '--', '--', '--'] },
  ],
};

export const privacy = [
  { metric: 'Mean dist. to closest record (synthetic vs real holdout)', v1: '--', v2: '--', max: 1 },
  { metric: 'Exact copies (0-distance rows)', v1: '--', v2: '--', max: 1 },
];

export const versionComparison = {
  columns: ['Architecture', 'Loss', 'Packing', 'Notes'],
  rows: [
    {
      dataset: 'V1 — BCE cGAN',
      values: ['Generator + Discriminator', 'BCE', 'None', 'Standard cross-entropy, mode collapse risk'],
    },
    {
      dataset: 'V2 — cWGAN-GP',
      values: ['Generator + Critic', 'Wasserstein + GP', 'PacGAN (pac=10)', 'Stabler, higher fidelity & utility'],
    },
  ],
};

export type Cell = string;
