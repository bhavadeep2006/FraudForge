import { techStack } from '@/data';

export default function TechStack() {
  return (
    <section id="stack" className="bg-white py-24">
      <div className="mx-auto max-w-6xl px-6">
        <p className="text-sm font-semibold uppercase tracking-widest text-teal-600">
          Tech stack
        </p>
        <h2 className="mt-2 text-3xl font-bold tracking-tight text-navy-600 md:text-4xl">
          Built with
        </h2>
        <div className="mt-8 flex flex-wrap gap-3">
          {techStack.map((t) => (
            <span
              key={t}
              className="rounded-full border border-navy-100 bg-navy-50/50 px-5 py-2 text-sm font-semibold text-navy-600 transition hover:border-teal-300 hover:text-teal-700"
            >
              {t}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
