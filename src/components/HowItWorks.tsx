import { ArrowRight } from 'lucide-react';
import { howItWorks } from '@/data';

export default function HowItWorks() {
  return (
    <section id="how" className="bg-navy-50 py-24">
      <div className="mx-auto max-w-6xl px-6">
        <p className="text-sm font-semibold uppercase tracking-widest text-teal-600">
          How it works
        </p>
        <h2 className="mt-2 text-3xl font-bold tracking-tight text-navy-600 md:text-4xl">
          From real records to synthetic tables
        </h2>

        {/* horizontal 5-step flow */}
        <div className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-9 md:items-stretch">
          {howItWorks.steps.map((step, i) => {
            const isLast = i === howItWorks.steps.length - 1;
            return (
              <div
                key={step.label}
                className="contents md:flex md:items-stretch"
              >
                <div className="flex flex-1 flex-col rounded-xl border border-navy-100 bg-white p-5 shadow-sm">
                  <span className="text-xs font-bold text-teal-600">
                    Step {i + 1}
                  </span>
                  <h3 className="mt-1.5 text-base font-semibold text-navy-600">
                    {step.label}
                  </h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-navy-400">
                    {step.detail}
                  </p>
                </div>
                {!isLast && (
                  <div className="flex items-center justify-center py-2 md:py-0">
                    <ArrowRight className="h-5 w-5 shrink-0 text-teal-500" />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-10 rounded-2xl border border-navy-100 bg-white p-6">
          <h3 className="text-sm font-semibold uppercase tracking-widest text-navy-300">
            Architecture detail
          </h3>
          <p className="mt-3 text-sm leading-relaxed text-navy-500">
            {howItWorks.paragraph}
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { k: 'Noise dim', v: '128' },
              { k: 'Condition dim', v: '5' },
              { k: 'Hidden units', v: '256 × 2 residual' },
              { k: 'Critic packing', v: 'PacGAN, pac=10' },
            ].map((x) => (
              <div key={x.k} className="rounded-lg bg-navy-50 px-4 py-3">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-navy-300">
                  {x.k}
                </div>
                <div className="mt-0.5 text-sm font-semibold text-navy-600">{x.v}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
