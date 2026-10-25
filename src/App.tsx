import { Nav, Hero, Problem, HowItWorks, Demo, Results, TechStack, Limitations, Footer } from '@/components';

function scrollToId(id: string) {
  const el = document.getElementById(id);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

export default function App() {
  return (
    <div className="min-h-screen bg-white font-sans text-navy-600">
      <Nav onScrollTo={scrollToId} />
      <main>
        <Hero onScrollTo={scrollToId} />
        <Problem />
        <HowItWorks />
        <Demo />
        <Results />
        <TechStack />
        <Limitations />
      </main>
      <Footer />
    </div>
  );
}
