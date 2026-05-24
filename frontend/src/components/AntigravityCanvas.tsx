import { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
}

interface TextNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
  text: string;
  width: number;
  height: number;
  color: string;
  bgColor: string;
  borderColor: string;
}

interface AntigravityCanvasProps {
  variant?: 'default' | 'landing';
  /** Up to 4 module codes shown on landing (from real workspace modules) */
  moduleCodes?: string[];
}

export function AntigravityCanvas({ variant = 'default', moduleCodes = [] }: AntigravityCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mouseRef = useRef({ x: -1000, y: -1000, active: false });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const isLanding = variant === 'landing';
    let animationFrameId: number;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY, active: true };
    };
    const handleMouseLeave = () => {
      mouseRef.current = { x: -1000, y: -1000, active: false };
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);

    const particleCount = isLanding ? 180 : 100;
    const particles: Particle[] = [];
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        vx: (Math.random() - 0.5) * (isLanding ? 0.5 : 0.35),
        vy: (Math.random() - 0.5) * (isLanding ? 0.5 : 0.35),
        size: Math.random() * (isLanding ? 2.5 : 2.2) + 0.5,
        opacity: Math.random() * 0.5 + 0.12,
      });
    }

    const landingBaseTags = [
      'My-Notion',
      'personal',
      'academic',
      'calendar',
      'upcoming tasks',
      'learn',
      'AI assistant',
      'study',
      'RAG',
      'workspace',
    ];
    const dynamicCodes = moduleCodes.filter(Boolean).slice(0, 4);

    const tagTexts = isLanding
      ? [...landingBaseTags, ...dynamicCodes]
      : [
          'My-Notion',
          'academic',
          'personal',
          'calendar',
          'study',
          'RAG',
          ...dynamicCodes,
        ];

    const textNodes: TextNode[] = tagTexts.map((text, i) => {
      const paddingX = isLanding ? 22 : 20;
      const paddingY = isLanding ? 11 : 10;
      const textWidth = text.length * (isLanding ? 8 : 7.5);
      const w = textWidth + paddingX * 2;
      const h = 14 + paddingY * 2;

      const colors = [
        { text: '#38bdf8', bg: 'rgba(56, 189, 248, 0.1)', border: 'rgba(56, 189, 248, 0.3)' },
        { text: '#fbbf24', bg: 'rgba(251, 191, 36, 0.09)', border: 'rgba(251, 191, 36, 0.28)' },
        { text: '#34d399', bg: 'rgba(52, 211, 153, 0.1)', border: 'rgba(52, 211, 153, 0.28)' },
        { text: '#a78bfa', bg: 'rgba(139, 92, 246, 0.1)', border: 'rgba(139, 92, 246, 0.28)' },
        { text: '#fb7185', bg: 'rgba(251, 113, 133, 0.1)', border: 'rgba(251, 113, 133, 0.3)' },
      ];
      const colorScheme = colors[i % colors.length];

      return {
        x: Math.random() * (window.innerWidth - w) + w / 2,
        y: Math.random() * (window.innerHeight - h) + h / 2,
        vx: (Math.random() - 0.5) * (isLanding ? 0.65 : 0.55),
        vy: (Math.random() - 0.5) * (isLanding ? 0.65 : 0.55),
        text,
        width: w,
        height: h,
        color: colorScheme.text,
        bgColor: colorScheme.bg,
        borderColor: colorScheme.border,
      };
    });

    const repulsionRadius = isLanding ? 280 : 220;
    const pushStrength = isLanding ? 0.65 : 0.45;
    const friction = 0.96;
    const linkDistance = isLanding ? 110 : 0;

    const updatePhysics = () => {
      const mouse = mouseRef.current;

      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0) p.x = window.innerWidth;
        if (p.x > window.innerWidth) p.x = 0;
        if (p.y < 0) p.y = window.innerHeight;
        if (p.y > window.innerHeight) p.y = 0;

        if (mouse.active) {
          const dx = p.x - mouse.x;
          const dy = p.y - mouse.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < repulsionRadius) {
            const force = (repulsionRadius - dist) / repulsionRadius;
            p.x += (dx / (dist || 1)) * force * (isLanding ? 3.2 : 2.5);
            p.y += (dy / (dist || 1)) * force * (isLanding ? 3.2 : 2.5);
          }
        }
      }

      for (let i = 0; i < textNodes.length; i++) {
        const node = textNodes[i];
        node.vx *= friction;
        node.vy *= friction;
        node.vx += (Math.random() - 0.5) * 0.02;
        node.vy += (Math.random() - 0.5) * 0.02;

        node.x += node.vx;
        node.y += node.vy;

        if (mouse.active) {
          const dx = node.x - mouse.x;
          const dy = node.y - mouse.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < repulsionRadius) {
            const force = (repulsionRadius - dist) / repulsionRadius;
            node.vx += (dx / (dist || 1)) * force * pushStrength;
            node.vy += (dy / (dist || 1)) * force * pushStrength;
          }
        }

        const halfW = node.width / 2;
        const halfH = node.height / 2;

        if (node.x - halfW < 0) {
          node.x = halfW;
          node.vx = Math.abs(node.vx) * 0.5;
        } else if (node.x + halfW > window.innerWidth) {
          node.x = window.innerWidth - halfW;
          node.vx = -Math.abs(node.vx) * 0.5;
        }

        if (node.y - halfH < 0) {
          node.y = halfH;
          node.vy = Math.abs(node.vy) * 0.5;
        } else if (node.y + halfH > window.innerHeight) {
          node.y = window.innerHeight - halfH;
          node.vy = -Math.abs(node.vy) * 0.5;
        }

        for (let j = i + 1; j < textNodes.length; j++) {
          const other = textNodes[j];
          const ox = node.x - other.x;
          const oy = node.y - other.y;
          const oDist = Math.sqrt(ox * ox + oy * oy);
          const minDist = (node.width + other.width) / 2 + 12;
          if (oDist < minDist && oDist > 0) {
            const push = ((minDist - oDist) / oDist) * 0.02;
            node.vx += ox * push;
            node.vy += oy * push;
            other.vx -= ox * push;
            other.vy -= oy * push;
          }
        }
      }
    };

    const drawLinks = () => {
      if (!linkDistance) return;
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const a = particles[i];
          const b = particles[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < linkDistance) {
            const alpha = (1 - dist / linkDistance) * 0.35;
            ctx.strokeStyle = `rgba(129, 140, 248, ${alpha})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const mouse = mouseRef.current;
      if (mouse.active) {
        const glowRadius = isLanding ? 340 : 280;
        const gradient = ctx.createRadialGradient(
          mouse.x,
          mouse.y,
          0,
          mouse.x,
          mouse.y,
          glowRadius
        );
        gradient.addColorStop(0, isLanding ? 'rgba(99, 102, 241, 0.18)' : 'rgba(99, 102, 241, 0.12)');
        gradient.addColorStop(0.4, 'rgba(139, 92, 246, 0.06)');
        gradient.addColorStop(1, 'transparent');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        if (isLanding) {
          ctx.strokeStyle = 'rgba(165, 180, 252, 0.15)';
          ctx.lineWidth = 1;
          for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 6) {
            ctx.beginPath();
            ctx.moveTo(mouse.x, mouse.y);
            ctx.lineTo(
              mouse.x + Math.cos(angle) * 120,
              mouse.y + Math.sin(angle) * 120
            );
            ctx.stroke();
          }
        }
      }

      drawLinks();

      for (const p of particles) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(165, 180, 252, ${p.opacity})`;
        ctx.fill();
      }

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `600 ${isLanding ? 14 : 13}px "Manrope", sans-serif`;

      for (const node of textNodes) {
        const halfW = node.width / 2;
        const halfH = node.height / 2;
        const x = node.x - halfW;
        const y = node.y - halfH;
        const radius = isLanding ? 20 : 18;

        ctx.fillStyle = node.bgColor;
        ctx.beginPath();
        ctx.roundRect(x, y, node.width, node.height, radius);
        ctx.fill();

        ctx.strokeStyle = node.borderColor;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(x, y, node.width, node.height, radius);
        ctx.stroke();

        ctx.fillStyle = node.color;
        ctx.fillText(node.text, node.x, node.y);
      }
    };

    const loop = () => {
      updatePhysics();
      draw();
      animationFrameId = requestAnimationFrame(loop);
    };

    loop();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [variant, moduleCodes.join('|')]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 h-full w-full pointer-events-none"
      style={{ zIndex: 0 }}
      aria-hidden
    />
  );
}
