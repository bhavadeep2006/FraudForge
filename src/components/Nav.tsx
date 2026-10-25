import { useEffect, useState } from 'react';
import { Database, Menu, X, CheckCircle2, AlertCircle } from 'lucide-react';
import { api } from '@/lib/api';

const items = [
  { id: 'problem', label: 'Problem' },
  { id: 'how', label: 'How it works' },
  { id: 'demo', label: 'Demo' },
  { id: 'results', label: 'Results' },
  { id: 'stack', label: 'Stack' },
  { id: 'scope', label: 'Scope' },
];

interface Props {
  onScrollTo: (id: string) => void;
}

export default function Nav({ onScrollTo }: Props) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [isOnline, setIsOnline] = useState<boolean | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    let active = true;
    const check = async () => {
      try {
        await api.getHealth();
        if (active) setIsOnline(true);
      } catch {
        if (active) setIsOnline(false);
      }
    };
    check();
    const interval = setInterval(check, 15000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  const go = (id: string) => {
    setOpen(false);
    onScrollTo(id);
  };

  return (
    <header
      className={
        'sticky top-0 z-50 transition-colors ' +
        (scrolled
          ? 'bg-navy-600/95 backdrop-blur shadow-md shadow-navy-600/10'
          : 'bg-transparent')
      }
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
        <button
          onClick={() => go('hero')}
          className="flex items-center gap-2 text-white"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500 text-navy-800">
            <Database className="h-4.5 w-4.5" strokeWidth={2} />
          </span>
          <span className="hidden text-sm font-semibold sm:block">
            cGAN Finance Synthesizer
          </span>
        </button>

        <div className="hidden items-center gap-4 md:flex">
          <nav className="flex items-center gap-1">
            {items.map((it) => (
              <button
                key={it.id}
                onClick={() => go(it.id)}
                className="rounded-lg px-3 py-2 text-sm font-medium text-navy-100 transition hover:bg-white/10 hover:text-white"
              >
                {it.label}
              </button>
            ))}
          </nav>

          {/* Live API Status Pill */}
          <div className="pl-2 border-l border-white/10">
            {isOnline === true ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-500/20 px-2.5 py-1 text-[11px] font-medium text-teal-200">
                <CheckCircle2 className="h-3 w-3 text-teal-400" /> API Connected
              </span>
            ) : isOnline === false ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/20 px-2.5 py-1 text-[11px] font-medium text-amber-200">
                <AlertCircle className="h-3 w-3 text-amber-400" /> Offline Mode
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-medium text-white/60">
                Connecting...
              </span>
            )}
          </div>
        </div>

        <button
          onClick={() => setOpen((v) => !v)}
          className="rounded-lg p-2 text-white transition hover:bg-white/10 md:hidden"
          aria-label="Toggle menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <nav className="border-t border-white/10 bg-navy-600 md:hidden">
          {items.map((it) => (
            <button
              key={it.id}
              onClick={() => go(it.id)}
              className="block w-full px-6 py-3 text-left text-sm font-medium text-navy-100 transition hover:bg-white/10 hover:text-white"
            >
              {it.label}
            </button>
          ))}
        </nav>
      )}
    </header>
  );
}
