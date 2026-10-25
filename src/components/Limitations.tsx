import { CheckCircle2, Target } from 'lucide-react';
import { limitations, futureScope } from '@/data';

export default function Limitations() {
  return (
    <section id="scope" className="bg-navy-50 py-24">
      <div className="mx-auto max-w-6xl px-6">
        <p className="text-sm font-semibold uppercase tracking-widest text-teal-600">
          Limitations &amp; future scope
        </p>
        <h2 className="mt-2 text-3xl font-bold tracking-tight text-navy-600 md:text-4xl">
          Where this project stands today
        </h2>

        <div className="mt-10 grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-navy-100 bg-white p-7">
            <h3 className="flex items-center gap-2 text-base font-semibold text-navy-600">
              <CheckCircle2 className="h-5 w-5 text-teal-600" strokeWidth={1.75} />
              Current limitations
            </h3>
            <ul className="mt-5 space-y-3">
              {limitations.map((l) => (
                <li key={l} className="flex gap-3 text-sm text-navy-500">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-500" />
                  <span>{l}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-navy-100 bg-white p-7">
            <h3 className="flex items-center gap-2 text-base font-semibold text-navy-600">
              <Target className="h-5 w-5 text-teal-600" strokeWidth={1.75} />
              Future scope
            </h3>
            <ul className="mt-5 space-y-3">
              {futureScope.map((l) => (
                <li key={l} className="flex gap-3 text-sm text-navy-500">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-500" />
                  <span>{l}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
