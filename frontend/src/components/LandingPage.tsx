import { useEffect } from 'react';
import { AntigravityCanvas } from './AntigravityCanvas';
import { LandingCta } from './landing/LandingCta';
import { LandingHero } from './landing/LandingHero';

interface LandingPageProps {
  onEnterWorkspace: () => void;
  moduleCodes?: string[];
}

export function LandingPage({ onEnterWorkspace, moduleCodes = [] }: LandingPageProps) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  return (
    <div className="landing-scene relative h-[100dvh] w-full overflow-hidden bg-[color:var(--bg-primary)] text-[color:var(--text-primary)]">
      <AntigravityCanvas variant="landing" moduleCodes={moduleCodes} />

      <div className="landing-atmosphere pointer-events-none absolute inset-0 z-[1]" aria-hidden>
        <div className="landing-aurora landing-aurora-a" />
        <div className="landing-aurora landing-aurora-b" />
        <div className="landing-hero-ambient" />
        <div className="landing-vignette" />
        <div className="landing-grain" />
      </div>

      <div className="relative z-10 flex h-full flex-col items-center justify-center px-6">
        <LandingHero />
        <LandingCta onClick={onEnterWorkspace} />
      </div>
    </div>
  );
}
