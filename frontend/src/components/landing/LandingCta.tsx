import { useRef } from 'react';
import { motion } from 'motion/react';
import { ArrowRight } from 'lucide-react';

interface LandingCtaProps {
  onClick: () => void;
}

export function LandingCta({ onClick }: LandingCtaProps) {
  const btnRef = useRef<HTMLButtonElement>(null);

  const handleMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    const el = btnRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 10;
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * 8;
    el.style.setProperty('--cta-mx', `${x}px`);
    el.style.setProperty('--cta-my', `${y}px`);
    el.style.setProperty('--cta-gx', `${((e.clientX - rect.left) / rect.width) * 100}%`);
  };

  const handleLeave = () => {
    const el = btnRef.current;
    if (!el) return;
    el.style.setProperty('--cta-mx', '0px');
    el.style.setProperty('--cta-my', '0px');
    el.style.setProperty('--cta-gx', '50%');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, delay: 0.32, ease: [0.16, 1, 0.3, 1] }}
      className="pointer-events-auto mt-10 sm:mt-12"
    >
      <button
        ref={btnRef}
        type="button"
        onClick={onClick}
        onMouseMove={handleMove}
        onMouseLeave={handleLeave}
        className="landing-cta group"
        style={
          {
            '--cta-mx': '0px',
            '--cta-my': '0px',
            '--cta-gx': '50%',
          } as React.CSSProperties
        }
      >
        <span className="landing-cta-border" aria-hidden />
        <span className="landing-cta-sheen" aria-hidden />
        <span className="landing-cta-inner">
          <span className="landing-cta-label">Enter workspace</span>
          <ArrowRight className="landing-cta-icon h-6 w-6" strokeWidth={2.25} />
        </span>
      </button>
    </motion.div>
  );
}
