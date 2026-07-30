import { useState } from 'react'
import { ChevronDown, ArrowRight } from 'lucide-react'
import { useCountUp } from '../../hooks/useCountUp'
import { useInView } from '../../hooks/useInView'
import { formatMetric, type ModuleSection, type Range } from '../model'
import { ActivityFeed, DeltaBadge, Expandable, StatGrid, StatusBadge, SubTitle } from './bits'
import { BreakdownList, Meter, Sparkline, SplitBar } from './viz'

interface Props {
  section: ModuleSection
  range: Range
}

/**
 * The uniform report block: metric → label → status → tiny trend →
 * expandable details → recent activity → AI insight → quick actions.
 */
export default function MetricSection({ section, range }: Props) {
  const [open, setOpen] = useState(false)
  const { ref, inView } = useInView<HTMLElement>()
  const hero = { ...section.hero, ...section.byRange?.[range] }
  const metric = useCountUp(hero.value, {
    enabled: inView,
    format: (v) => formatMetric(v, hero.format),
  })
  const Icon = section.icon

  return (
    <section ref={ref} id={section.id} className="scroll-mt-40 border-b border-line">
      <div className="px-5 py-6">
        {/* Whole summary is the tap target for inline expansion */}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls={`${section.id}-details`}
          className="block w-full cursor-pointer text-left"
        >
          <div className="flex items-center gap-2.5">
            <Icon size={18} strokeWidth={1.75} className="shrink-0 text-ink-2" aria-hidden />
            <h2 className="flex-1 text-[18px] leading-6 font-medium text-ink">{section.title}</h2>
            <StatusBadge status={section.status} />
            <ChevronDown
              size={16}
              strokeWidth={2}
              aria-hidden
              className={`shrink-0 text-ink-3 transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
            />
          </div>

          <div className="mt-4 flex items-end justify-between gap-4">
            <div className="min-w-0">
              <p
                className="origin-bottom-left text-[34px] leading-10 font-semibold tracking-[-0.01em] text-ink transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
                style={{ transform: open ? 'scale(1.04)' : 'scale(1)' }}
              >
                {metric}
              </p>
              <p className="mt-2 text-[13px] leading-4 text-ink-2">{hero.label}</p>
              {hero.delta && (
                <div className="mt-2">
                  <DeltaBadge delta={hero.delta} />
                </div>
              )}
            </div>
            {hero.trend && <Sparkline data={hero.trend} accent={section.accent} animate={inView} />}
          </div>
        </button>

        <div id={`${section.id}-details`}>
          <Expandable open={open}>
            <div className="flex flex-col gap-6 pt-6">
              {section.split && (
                <div>
                  <SubTitle>{section.split.title}</SubTitle>
                  <SplitBar segments={section.split.segments} animate={open} />
                </div>
              )}
              {section.stats && (
                <div>
                  <SubTitle>{section.stats.title}</SubTitle>
                  <StatGrid items={section.stats.items} />
                </div>
              )}
              {section.meter && (
                <Meter
                  label={section.meter.label}
                  value={section.meter.value}
                  fraction={section.meter.fraction}
                  accent={section.accent}
                  animate={open}
                />
              )}
              {section.breakdown && (
                <div>
                  <SubTitle>{section.breakdown.title}</SubTitle>
                  <BreakdownList items={section.breakdown.items} accent={section.accent} animate={open} />
                </div>
              )}
              {section.activity && (
                <div>
                  <SubTitle>{section.activity.title}</SubTitle>
                  <ActivityFeed items={section.activity.items} />
                </div>
              )}
              <div className="flex flex-wrap items-center gap-2">
                {section.actions?.map((action) => (
                  <button
                    key={action}
                    type="button"
                    className="cursor-pointer rounded-full border border-line px-3.5 py-1.5 text-[13px] font-medium text-ink transition-colors duration-200 active:bg-page"
                  >
                    {action}
                  </button>
                ))}
                <button
                  type="button"
                  className="ml-auto flex cursor-pointer items-center gap-1 py-1.5 text-[13px] font-medium text-ink-2 transition-colors duration-200 active:text-ink"
                >
                  View complete analytics
                  <ArrowRight size={14} strokeWidth={2} aria-hidden />
                </button>
              </div>
            </div>
          </Expandable>
        </div>
      </div>
    </section>
  )
}
