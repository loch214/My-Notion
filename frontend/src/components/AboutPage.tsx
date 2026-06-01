import { ArrowUpRight, CheckCircle2, Github, Globe, Sparkles, Target } from 'lucide-react';
import { motion } from 'motion/react';
import { Card } from './ui/Card';
import { SectionHeader } from './ui/SectionHeader';

const profileLinks = [
  {
    id: 'github',
    title: 'GitHub',
    subtitle: 'Project code.',
    href: 'https://github.com/loch214',
    icon: Github,
    cta: 'Open repo',
  },
  {
    id: 'portfolio',
    title: 'Portfolio',
    subtitle: 'Other work.',
    href: 'https://lochd-my-portfolio.vercel.app/',
    icon: Globe,
    cta: 'Visit site',
  },
] as const;

const projectTraits = ['Modules, tasks, and schedule in one place.', 'An AI assistant for quick help.', 'Themes that stay out of the way.'] as const;

const nextIdeas = ['Weekly recap cards.', 'Deadline warnings.', 'Keyboard-first launcher.'] as const;

const gettingStartedSteps = [
  'Create your first module in Academic.',
  'Add one task with a due date in Personal or Academic Tasks.',
  'Set one calendar event with a reminder.',
  'Use the global AI chat for quick planning or status checks.',
] as const;

export function AboutPage() {
  return (
    <div className="text-[color:var(--text)]">
      <SectionHeader category="Workspace" title="About" subtitle="What this app does and where to find the code." />

      <div className="space-y-6">
        <Card spotlight={false} className="card-pad overflow-hidden bg-[color:var(--surface-low)]">
          <div className="relative z-10 grid gap-4 lg:grid-cols-[1.7fr_1fr]">
            <div>
              <h2 className="mt-1 font-heading text-2xl font-semibold leading-tight text-[color:var(--text)]">What this app does</h2>
              <p className="mt-3 max-w-[64ch] text-sm leading-relaxed text-[color:var(--muted)]">My-Notion keeps modules, tasks, calendar, and AI together.</p>
              <h3 className="mt-4 text-sm font-semibold text-[color:var(--text)]">AI helps with</h3>
              <ul className="mt-2 space-y-2 text-sm text-[color:var(--muted)]">
                <li>Summaries.</li>
                <li>Study plans.</li>
                <li>Quick answers.</li>
              </ul>
            </div>

            <div className="p-0">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--muted)]">Why use it</p>
              <p className="mt-2 text-sm text-[color:var(--muted)]">Less switching. More focus.</p>
              <ul className="mt-3 space-y-2 text-sm text-[color:var(--muted)]">
                {projectTraits.map((trait) => (
                  <li key={trait} className="flex items-start gap-2">
                    <span className="mt-1 inline-block h-2 w-2 rounded-full bg-[color:var(--muted)]/70" />
                    <span>{trait}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Card>

        <Card spotlight={false} className="card-pad border border-[color:var(--border)] bg-[color:var(--surface-low)]/75">
          <div className="mb-4 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[color:var(--accent)]" />
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[color:var(--muted)]">Getting Started</p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {gettingStartedSteps.map((step, index) => (
              <div key={step} className="flex items-start gap-2 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-med)]/45 px-3 py-2.5">
                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[color:var(--accent)]/20 text-[11px] font-semibold text-[color:var(--accent)]">
                  {index + 1}
                </span>
                <p className="text-sm text-[color:var(--muted)]">{step}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-med)]/45 px-3 py-2.5">
            <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-400" />
            <p className="text-sm text-[color:var(--muted)]">
              Tip: Notifications are generated from tasks, events, and timetable reminders. Once marked read, they now persist across sessions.
            </p>
          </div>
        </Card>

        <div className="grid gap-4 lg:grid-cols-2">
          {profileLinks.map((item) => {
            const Icon = item.icon;
            return (
              <motion.a key={item.id} href={item.href} target="_blank" rel="noreferrer" whileHover={{ y: -3 }} transition={{ duration: 0.18 }} className="group block overflow-hidden rounded-2xl p-4 transition-all duration-200 ease hover:bg-[color:var(--surface-low)]/90">
                <div className="flex items-start justify-between gap-4">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-med)] text-[color:var(--accent)]">
                    <Icon className="h-5 w-5" />
                  </span>
                </div>
                <h3 className="mt-4 text-lg font-semibold text-[color:var(--text)]">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[color:var(--muted)]">{item.subtitle}</p>
                <p className="mt-4 inline-flex items-center px-3 py-1 text-xs font-semibold tracking-wide text-[color:var(--text)]">{item.cta}</p>
              </motion.a>
            );
          })}
        </div>

        <Card spotlight={false} className="card-pad border border-[color:var(--border)] bg-[color:var(--surface-low)]/65">
          <div className="mb-4 flex items-center gap-2">
            <Target className="h-4 w-4 text-[color:var(--accent)]" />
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[color:var(--muted)]">Next</p>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {nextIdeas.map((idea) => (
              <div key={idea} className="p-2 text-sm leading-relaxed text-[color:var(--muted)]">
                <p className="font-semibold text-[color:var(--text)] text-sm mb-1">{idea}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

export default AboutPage;
