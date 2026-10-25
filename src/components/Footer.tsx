import { Github, ExternalLink } from 'lucide-react';
import { links } from '@/data';

export default function Footer() {
  return (
    <footer className="bg-navy-700 text-navy-100">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
          <p className="text-sm text-navy-200">
            Academic project, Department of CSE (AI &amp; ML), 2026-2027
          </p>
          <div className="flex gap-4">
            <a
              href={links.github}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-4 py-2 text-xs font-semibold text-white transition hover:border-teal-400 hover:text-teal-200"
            >
              <Github className="h-4 w-4" /> GitHub
            </a>
            <a
              href={links.streamlit}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-4 py-2 text-xs font-semibold text-white transition hover:border-teal-400 hover:text-teal-200"
            >
              <ExternalLink className="h-4 w-4" /> Live App
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
