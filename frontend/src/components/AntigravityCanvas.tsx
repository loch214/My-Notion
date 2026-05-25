import { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  layer: 0 | 1;
  phase: number;
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
  glowColor: string;
}

interface AntigravityCanvasProps {
  variant?: 'default' | 'landing';
  moduleCodes?: string[];
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

/** First letter of each word capitalized; acronyms (e.g. RAG) stay uppercase */
function formatFloatingLabel(text: string): string {
  return text
    .split(' ')
    .map((word) => {
      if (word.length <= 4 && word === word.toUpperCase()) return word;
      const lower = word.toLowerCase();
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(' ');
}

export function AntigravityCanvas({ variant = 'default', moduleCodes = [] }: AntigravityCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mouseRef = useRef({ x: -1000, y: -1000, active: false });
  const smoothMouseRef = useRef({ x: -1000, y: -1000, active: false });
  const sizeRef = useRef({ w: 0, h: 0, dpr: 1 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const isLanding = variant === 'landing';
    let animationFrameId: number;
    let time = 0;

    const resizeCanvas = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = window.innerWidth;
      const h = window.innerHeight;
      sizeRef.current = { w, h, dpr };
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY, active: true };
    };
    const handleMouseLeave = () => {
      mouseRef.current = { x: -1000, y: -1000, active: false };
    };
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('mouseleave', handleMouseLeave);

    const { w: initW, h: initH } = sizeRef.current;
    const nearCount = isLanding ? 72 : 100;
    const farCount = isLanding ? 36 : 0;
    const particles: Particle[] = [];

    for (let i = 0; i < nearCount; i++) {
      particles.push({
        x: Math.random() * initW,
        y: Math.random() * initH,
        vx: (Math.random() - 0.5) * (isLanding ? 0.28 : 0.35),
        vy: (Math.random() - 0.5) * (isLanding ? 0.28 : 0.35),
        size: isLanding ? Math.random() * 1.4 + 1.35 : Math.random() * 2.2 + 0.5,
        opacity: Math.random() * 0.35 + 0.25,
        layer: 1,
        phase: Math.random() * Math.PI * 2,
      });
    }
    for (let i = 0; i < farCount; i++) {
      particles.push({
        x: Math.random() * initW,
        y: Math.random() * initH,
        vx: (Math.random() - 0.5) * 0.12,
        vy: (Math.random() - 0.5) * 0.12,
        size: Math.random() * 0.8 + 0.4,
        opacity: Math.random() * 0.15 + 0.08,
        layer: 0,
        phase: Math.random() * Math.PI * 2,
      });
    }

    const landingBaseTags = [
      'My-Notion',
      'Personal',
      'Academic',
      'Calendar',
      'Upcoming tasks',
      'Learn',
      'AI Assistant',
      'Study',
      'RAG',
      'Workspace',
    ];
    const dynamicCodes = moduleCodes.filter(Boolean).slice(0, 4).map(formatFloatingLabel);
    const tagTexts = isLanding
      ? [...landingBaseTags, ...dynamicCodes]
      : ['My-Notion', 'Academic', 'Personal', 'Calendar', 'Study', 'RAG', ...dynamicCodes];

    const colors = [
      { text: '#38bdf8', bg: 'rgba(56, 189, 248, 0.18)', border: 'rgba(56, 189, 248, 0.45)', glow: 'rgba(56, 189, 248, 0.35)' },
      { text: '#fbbf24', bg: 'rgba(251, 191, 36, 0.16)', border: 'rgba(251, 191, 36, 0.42)', glow: 'rgba(251, 191, 36, 0.3)' },
      { text: '#34d399', bg: 'rgba(52, 211, 153, 0.17)', border: 'rgba(52, 211, 153, 0.42)', glow: 'rgba(52, 211, 153, 0.32)' },
      { text: '#a78bfa', bg: 'rgba(139, 92, 246, 0.17)', border: 'rgba(139, 92, 246, 0.42)', glow: 'rgba(139, 92, 246, 0.32)' },
      { text: '#fb7185', bg: 'rgba(251, 113, 133, 0.17)', border: 'rgba(251, 113, 133, 0.42)', glow: 'rgba(251, 113, 133, 0.32)' },
    ];

    const tagFontSize = isLanding ? 15 : 13;
    const tagFont = `600 ${tagFontSize}px "Manrope", ui-sans-serif, sans-serif`;
    ctx.font = tagFont;

    const textNodes: TextNode[] = tagTexts.map((text, i) => {
      const paddingX = isLanding ? 26 : 20;
      const paddingY = isLanding ? 14 : 10;
      const textWidth = ctx.measureText(text).width;
      const w = textWidth + paddingX * 2;
      const h = tagFontSize + paddingY * 2;
      const colorScheme = colors[i % colors.length];
      return {
        x: Math.random() * (initW - w) + w / 2,
        y: Math.random() * (initH - h) + h / 2,
        vx: (Math.random() - 0.5) * (isLanding ? 0.42 : 0.55),
        vy: (Math.random() - 0.5) * (isLanding ? 0.42 : 0.55),
        text,
        width: w,
        height: h,
        color: colorScheme.text,
        bgColor: colorScheme.bg,
        borderColor: colorScheme.border,
        glowColor: colorScheme.glow,
      };
    });

    const repulsionRadius = isLanding ? 280 : 220;
    const pushStrength = isLanding ? 0.52 : 0.45;
    const friction = 0.97;
    const linkDistance = isLanding ? 152 : 0;
    const linkDistanceSq = linkDistance * linkDistance;
    const mouseLerp = isLanding ? 0.09 : 0.14;

    const updatePhysics = (width: number, height: number) => {
      const mouse = smoothMouseRef.current;

      for (const p of particles) {
        const drift = Math.sin(time * 0.0004 + p.phase) * 0.003;
        p.x += p.vx + drift;
        p.y += p.vy + drift * 0.6;

        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        if (mouse.active) {
          const dx = p.x - mouse.x;
          const dy = p.y - mouse.y;
          const distSq = dx * dx + dy * dy;
          const radiusSq = repulsionRadius * repulsionRadius;
          if (distSq < radiusSq && distSq > 0) {
            const dist = Math.sqrt(distSq);
            const force = (repulsionRadius - dist) / repulsionRadius;
            const push = force * (isLanding ? (p.layer === 1 ? 2.4 : 1.2) : 2.5);
            p.x += (dx / dist) * push;
            p.y += (dy / dist) * push;
          }
        }
      }

      for (let i = 0; i < textNodes.length; i++) {
        const node = textNodes[i];
        node.vx *= friction;
        node.vy *= friction;
        node.vx += (Math.random() - 0.5) * 0.012;
        node.vy += (Math.random() - 0.5) * 0.012;
        node.x += node.vx;
        node.y += node.vy;

        if (mouse.active) {
          const dx = node.x - mouse.x;
          const dy = node.y - mouse.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < repulsionRadius && dist > 0) {
            const force = (repulsionRadius - dist) / repulsionRadius;
            node.vx += (dx / dist) * force * pushStrength;
            node.vy += (dy / dist) * force * pushStrength;
          }
        }

        const halfW = node.width / 2;
        const halfH = node.height / 2;
        if (node.x - halfW < 0) {
          node.x = halfW;
          node.vx = Math.abs(node.vx) * 0.5;
        } else if (node.x + halfW > width) {
          node.x = width - halfW;
          node.vx = -Math.abs(node.vx) * 0.5;
        }
        if (node.y - halfH < 0) {
          node.y = halfH;
          node.vy = Math.abs(node.vy) * 0.5;
        } else if (node.y + halfH > height) {
          node.y = height - halfH;
          node.vy = -Math.abs(node.vy) * 0.5;
        }

        for (let j = i + 1; j < textNodes.length; j++) {
          const other = textNodes[j];
          const ox = node.x - other.x;
          const oy = node.y - other.y;
          const oDist = Math.sqrt(ox * ox + oy * oy);
          const minDist = (node.width + other.width) / 2 + (isLanding ? 18 : 14);
          if (oDist < minDist && oDist > 0) {
            const push = ((minDist - oDist) / oDist) * 0.018;
            node.vx += ox * push;
            node.vy += oy * push;
            other.vx -= ox * push;
            other.vy -= oy * push;
          }
        }
      }
    };

    const drawLinks = (width: number, height: number) => {
      if (!linkDistance) return;

      const nearOnly = particles.filter((p) => p.layer === 1);
      const cellSize = linkDistance;
      const cols = Math.ceil(width / cellSize);
      const rows = Math.ceil(height / cellSize);
      const grid: number[][] = Array.from({ length: cols * rows }, () => []);

      nearOnly.forEach((p, idx) => {
        const col = Math.floor(p.x / cellSize);
        const row = Math.floor(p.y / cellSize);
        const key = row * cols + col;
        if (grid[key]) grid[key].push(idx);
      });

      ctx.lineCap = 'round';
      const drawn = new Set<string>();

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const cell = grid[row * cols + col];
          if (!cell) continue;

          for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
              const nr = row + dr;
              const nc = col + dc;
              if (nr < 0 || nc < 0 || nr >= rows || nc >= cols) continue;
              const neighbor = grid[nr * cols + nc];
              if (!neighbor) continue;

              for (const i of cell) {
                for (const j of neighbor) {
                  if (i >= j) continue;
                  const pairKey = i < j ? `${i}-${j}` : `${j}-${i}`;
                  if (drawn.has(pairKey)) continue;

                  const a = nearOnly[i];
                  const b = nearOnly[j];
                  const dx = a.x - b.x;
                  const dy = a.y - b.y;
                  const distSq = dx * dx + dy * dy;
                  if (distSq > linkDistanceSq) continue;

                  drawn.add(pairKey);
                  const dist = Math.sqrt(distSq);
                  const alpha = (1 - dist / linkDistance) * (isLanding ? 0.34 : 0.22);
                  ctx.strokeStyle = `rgba(165, 180, 252, ${alpha})`;
                  ctx.lineWidth = isLanding ? 1.35 : 1;
                  ctx.beginPath();
                  ctx.moveTo(a.x, a.y);
                  ctx.lineTo(b.x, b.y);
                  ctx.stroke();
                }
              }
            }
          }
        }
      }
    };

    const drawMouseGlow = (width: number, height: number) => {
      const mouse = smoothMouseRef.current;
      if (!mouse.active) return;

      const glowRadius = isLanding ? 360 : 240;
      const gradient = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, glowRadius);
      gradient.addColorStop(0, isLanding ? 'rgba(99, 102, 241, 0.17)' : 'rgba(99, 102, 241, 0.12)');
      gradient.addColorStop(0.3, isLanding ? 'rgba(139, 92, 246, 0.08)' : 'rgba(139, 92, 246, 0.04)');
      gradient.addColorStop(0.65, 'rgba(129, 140, 248, 0.03)');
      gradient.addColorStop(1, 'transparent');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      if (isLanding) {
        const core = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, 90);
        core.addColorStop(0, 'rgba(199, 210, 254, 0.12)');
        core.addColorStop(1, 'transparent');
        ctx.fillStyle = core;
        ctx.fillRect(0, 0, width, height);
      }
    };

    const drawParticles = () => {
      for (const p of particles) {
        const x = Math.round(p.x * 2) / 2;
        const y = Math.round(p.y * 2) / 2;
        const pulse = 0.85 + Math.sin(time * 0.002 + p.phase) * 0.15;
        const alpha = p.opacity * pulse;

        if (p.layer === 1 && isLanding) {
          ctx.beginPath();
          ctx.arc(x, y, p.size + 1.5, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(129, 140, 248, ${alpha * 0.12})`;
          ctx.fill();
        }

        ctx.beginPath();
        ctx.arc(x, y, p.size, 0, Math.PI * 2);
        ctx.fillStyle =
          p.layer === 1
            ? `rgba(199, 210, 254, ${alpha})`
            : `rgba(148, 163, 200, ${alpha * 0.7})`;
        ctx.fill();
      }
    };

    const drawTags = () => {
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = tagFont;

      for (const node of textNodes) {
        const halfW = node.width / 2;
        const halfH = node.height / 2;
        const x = Math.round((node.x - halfW) * 2) / 2;
        const y = Math.round((node.y - halfH) * 2) / 2;
        const radius = isLanding ? 22 : 18;

        if (isLanding) {
          ctx.save();
          ctx.shadowColor = node.glowColor;
          ctx.shadowBlur = 16;
          ctx.fillStyle = 'rgba(12, 18, 32, 0.55)';
          ctx.beginPath();
          ctx.roundRect(x, y, node.width, node.height, radius);
          ctx.fill();
          ctx.restore();

          const glass = ctx.createLinearGradient(x, y, x, y + node.height);
          glass.addColorStop(0, 'rgba(255, 255, 255, 0.14)');
          glass.addColorStop(0.45, 'rgba(255, 255, 255, 0.03)');
          glass.addColorStop(1, 'rgba(255, 255, 255, 0)');
          ctx.fillStyle = node.bgColor;
          ctx.beginPath();
          ctx.roundRect(x, y, node.width, node.height, radius);
          ctx.fill();
          ctx.fillStyle = glass;
          ctx.beginPath();
          ctx.roundRect(x, y, node.width, node.height, radius);
          ctx.fill();

          ctx.strokeStyle = node.borderColor;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.roundRect(x, y, node.width, node.height, radius);
          ctx.stroke();

          ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.roundRect(x + 1, y + 1, node.width - 2, node.height * 0.42, radius - 2);
          ctx.stroke();
        } else {
          ctx.fillStyle = node.bgColor;
          ctx.beginPath();
          ctx.roundRect(x, y, node.width, node.height, radius);
          ctx.fill();

          ctx.strokeStyle = node.borderColor;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.roundRect(x, y, node.width, node.height, radius);
          ctx.stroke();
        }

        ctx.fillStyle = node.color;
        ctx.font = tagFont;
        ctx.fillText(node.text, node.x, node.y);
      }
    };

    const loop = () => {
      time += 16;
      const { w, h } = sizeRef.current;
      const raw = mouseRef.current;
      const smooth = smoothMouseRef.current;

      if (raw.active) {
        smooth.active = true;
        smooth.x = lerp(smooth.x, raw.x, mouseLerp);
        smooth.y = lerp(smooth.y, raw.y, mouseLerp);
      } else {
        smooth.active = false;
        smooth.x = lerp(smooth.x, -1000, 0.06);
        smooth.y = lerp(smooth.y, -1000, 0.06);
      }

      updatePhysics(w, h);

      ctx.clearRect(0, 0, w, h);
      drawMouseGlow(w, h);
      drawLinks(w, h);
      drawParticles();
      drawTags();

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
