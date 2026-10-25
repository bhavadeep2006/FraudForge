import { Shield, Scale, Layers } from 'lucide-react';
import { problems } from '@/data';

const iconMap = {
  shield: Shield,
  scale: Scale,
  layers: Layers,
} as const;

export default function Problem() {
  return (
    <section id="problem" className="bg-white py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-widest text-teal-600">
            The Problem
          </p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-navy-600 md:text-4xl">
            Why generating synthetic fraud data is hard
          </h2>
          <p className="mt-4 text-navy-300">
            Real financial datasets are locked, imbalanced, and resistant to naive
            upsampling. Three issues shape the design of this project.
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {problems.map((p, i) => {
            const Icon = iconMap[p.icon as keyof typeof iconMap];
            return (
              <div
                key={p.title}
                className="group rounded-2xl border border-navy-100 bg-navy-50/40 p-7 transition hover:border-teal-300 hover:shadow-lg hover:shadow-navy-600/5"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-navy-600 text-teal-300 transition group-hover:bg-teal-500 group-hover:text-navy-800">
                  <Icon className="h-6 w-6" strokeWidth={1.75} />
                </div>
                <div className="mt-5 flex items-center gap-3">
                  <span className="text-xs font-bold text-navy-300">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <h3 className="text-lg font-semibold text-navy-600">{p.title}</h3>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-navy-400">{p.body}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
