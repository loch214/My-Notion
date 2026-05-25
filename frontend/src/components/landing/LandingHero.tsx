import { useRef } from 'react';
import { motion, useMotionValue, useSpring } from 'motion/react';

export function LandingHero() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const spotX = useMotionValue(0);
  const spotY = useMotionValue(0);
  const smoothX = useSpring(spotX, { stiffness: 120, damping: 28 });
  const smoothY = useSpring(spotY, { stiffness: 120, damping: 28 });

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = wrapRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    spotX.set(((e.clientX - rect.left) / rect.width - 0.5) * 48);
    spotY.set(((e.clientY - rect.top) / rect.height - 0.5) * 32);
  };

  const handleLeave = () => {
    spotX.set(0);
    spotY.set(0);
  };

  return (
    <motion.div
      ref={wrapRef}
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      className="landing-hero pointer-events-auto relative select-none"
    >
      <motion.div
        className="landing-hero-spotlight"
        style={{ x: smoothX, y: smoothY }}
        aria-hidden
      />

      <h1 className="landing-hero-title">My-Notion</h1>
    </motion.div>
  );
}
