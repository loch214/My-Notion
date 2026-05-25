import { Check } from 'lucide-react';
import { motion } from 'motion/react';
import { useTheme } from '../context/ThemeContext';
import type { ThemeDefinition, ThemeId } from '../lib/themes/types';
import { Card } from './ui/Card';
import { SectionHeader } from './ui/SectionHeader';
import { cn } from '../lib/utils';

function ThemePreviewCard({
  theme,
  isActive,
  onSelect,
}: {
  theme: ThemeDefinition;
  isActive: boolean;
  onSelect: () => void;
}) {
  const [c1, c2, c3, c4] = theme.preview;

  return (
    <motion.button
      type="button"
      onClick={onSelect}
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.18, ease: [0.32, 0.72, 0, 1] }}
      className={cn(
        'group relative w-full overflow-hidden rounded-2xl border p-4 text-left transition-all duration-200 ease',
        'bg-[color:var(--surface-low)]/80 backdrop-blur-md',
        isActive
          ? 'border-[color:var(--accent)] shadow-[0_0_0_1px_var(--accent),0_12px_40px_var(--glow)]'
          : 'border-[color:var(--border)] hover:border-[color:var(--border-focus)] hover:shadow-[0_8px_28px_var(--glow)]'
      )}
      aria-pressed={isActive}
      aria-label={`Apply ${theme.name} theme`}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          background: `radial-gradient(circle at 20% 0%, ${c3}33, transparent 55%), radial-gradient(circle at 100% 100%, ${c4}22, transparent 50%)`,
        }}
      />

      <div className="relative z-10 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-heading text-sm font-semibold text-[color:var(--text)]">{theme.name}</p>
            <p className="mt-1 text-[11px] leading-relaxed text-[color:var(--muted)]">{theme.description}</p>
          </div>
          {isActive && (
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[color:var(--accent)] text-[color:var(--on-accent)] shadow-[0_0_16px_var(--glow)]">
              <Check className="h-3.5 w-3.5" strokeWidth={3} />
            </span>
          )}
        </div>

        <div className="flex gap-1.5">
          {[c1, c2, c3, c4].map((color, i) => (
            <span
              key={i}
              className="h-8 flex-1 rounded-lg border border-white/10 shadow-inner"
              style={{ background: color }}
            />
          ))}
        </div>

        <div
          className="h-10 rounded-xl border border-[color:var(--border)] px-3 flex items-center gap-2"
          style={{ background: `linear-gradient(135deg, ${c1}, ${c2})` }}
        >
          <span className="h-2 w-2 rounded-full" style={{ background: c3, boxShadow: `0 0 8px ${c3}` }} />
          <span className="h-1.5 flex-1 rounded-full bg-white/10" />
          <span className="h-4 w-10 rounded-md" style={{ background: `linear-gradient(90deg, ${c3}, ${c4})` }} />
        </div>
      </div>
    </motion.button>
  );
}

export function SettingsPage() {
  const { themeId, setTheme, themes } = useTheme();

  return (
    <div className="text-[color:var(--text)]">
      <SectionHeader
        category="Workspace"
        title="Settings"
        subtitle="Customize your workspace appearance. Changes apply instantly across the app."
      />

      <div className="space-y-6">
        <Card spotlight={false} className="card-pad border border-[color:var(--border)] bg-[color:var(--surface-low)]">
          <div className="mb-5 border-b border-[color:var(--border)] pb-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[color:var(--muted)]">
              Appearance
            </p>
            <h2 className="mt-1 font-heading text-xl font-semibold text-[color:var(--text)]">Themes</h2>
            <p className="mt-1 text-sm text-[color:var(--muted)]">
              Premium atmospheric palettes. Your choice is saved automatically.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {themes.map((theme) => (
              <ThemePreviewCard
                key={theme.id}
                theme={theme}
                isActive={themeId === theme.id}
                onSelect={() => setTheme(theme.id as ThemeId)}
              />
            ))}
          </div>
        </Card>

        <Card spotlight={false} className="card-pad border border-[color:var(--border)] bg-[color:var(--surface-low)]/60">
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[color:var(--muted)]">
            About themes
          </p>
          <p className="mt-2 text-sm leading-relaxed text-[color:var(--muted)]">
            Themes update global color tokens only — layout, spacing, and interactions stay the same. Module
            badges and charts keep their semantic colors for clarity.
          </p>
        </Card>
      </div>
    </div>
  );
}
