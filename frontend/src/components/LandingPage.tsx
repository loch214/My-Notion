import { useEffect } from 'react';
import { motion } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import { AntigravityCanvas } from './AntigravityCanvas';

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
    <div className="relative h-[100dvh] w-full overflow-hidden bg-[color:var(--app-bg)] text-[color:var(--text)]">
      <AntigravityCanvas variant="landing" moduleCodes={moduleCodes} />

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(99,102,241,0.08),transparent_70%)]" />

      <div className="relative z-10 flex h-full flex-col items-center justify-center px-6">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
          className="pointer-events-none text-center font-heading text-[clamp(3.5rem,12vw,7.5rem)] font-extrabold leading-none tracking-tight text-white drop-shadow-[0_0_48px_rgba(167,139,250,0.55)]"
        >
          My-Notion
        </motion.h1>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.35 }}
          className="pointer-events-auto mt-12 sm:mt-14"
        >
          <button
            type="button"
            onClick={onEnterWorkspace}
            className="group inline-flex items-center gap-3 rounded-2xl border border-violet-300/35 bg-gradient-to-r from-indigo-500/95 via-violet-600/95 to-purple-600/95 px-12 py-4 text-lg font-bold text-white shadow-[0_4px_24px_rgba(99,102,241,0.45),inset_0_1px_0_rgba(255,255,255,0.25)] backdrop-blur-md transition-all hover:scale-[1.04] hover:border-violet-200/50 hover:shadow-[0_8px_40px_rgba(139,92,246,0.55)]"
          >
            Enter workspace
            <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
          </button>
        </motion.div>
      </div>
    </div>
  );
}
