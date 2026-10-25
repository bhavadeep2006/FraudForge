import { Github, BarChart3 } from 'lucide-react';
import { hero, links } from '@/data';

interface Props {
  onScrollTo: (id: string) => void;
}

export default function Hero({ onScrollTo }: Props) {
  return (
    <section
      id="hero"
      className="relative overflow-hidden bg-navy-600 text-white"
    >
      {/* decorative grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            'linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />
      <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-teal-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -left-16 h-72 w-72 rounded-full bg-teal-500/10 blur-3xl" />

      <div className="relative mx-auto max-w-6xl px-6 py-24 md:py-32">
        <span className="inline-flex items-center gap-2 rounded-full border border-teal-400/40 bg-teal-500/10 px-4 py-1.5 text-xs font-medium tracking-wide text-teal-200">
          <BarChart3 className="h-3.5 w-3.5" />
          Conditional GAN · Synthetic Financial Data
        </span>

        <h1 className="mt-6 max-w-3xl text-4xl font-extrabold leading-[1.1] tracking-tight md:text-6xl">
          {hero.title}
        </h1>

        <p className="mt-6 max-w-2xl text-lg text-navy-100 md:text-xl">
          {hero.subtitle}
        </p>

        <div className="mt-9 flex flex-wrap gap-3">
          <button
            onClick={() => onScrollTo('demo')}
            className="rounded-lg bg-teal-500 px-6 py-3 text-sm font-semibold text-navy-800 transition hover:bg-teal-400 hover:shadow-lg hover:shadow-teal-500/20"
          >
            Try the Demo
          </button>
          <button
            onClick={() => onScrollTo('results')}
            className="rounded-lg border border-white/25 px-6 py-3 text-sm font-semibold text-white transition hover:border-white/60 hover:bg-white/5"
          >
            View Results
          </button>
          <a
            href={links.github}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-lg px-6 py-3 text-sm font-semibold text-navy-100 transition hover:text-white"
          >
            <Github className="h-4 w-4" />
            GitHub
          </a>
        </div>

        <p className="mt-10 text-sm font-medium text-navy-200">{hero.meta}</p>
      </div>
    </section>
  );
}
