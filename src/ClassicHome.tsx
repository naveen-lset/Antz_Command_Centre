import TopBar from './components/TopBar'
import HeroHeader from './components/HeroHeader'
import WeatherCard from './components/WeatherCard'
import PopulationCard from './components/PopulationCard'
import MiniStatCard from './components/MiniStatCard'
import ModuleRow from './components/ModuleRow'
import ApprovalsCard from './components/ApprovalsCard'
import QuickActions from './components/QuickActions'
import { snapshot } from './data'
import iconCaring from './assets/icon-caring.svg'
import iconEgg from './assets/icon-egg.svg'

/** Sections fade in one after another — calm, 250ms-class motion. */
function Reveal({ index, children }: { index: number; children: React.ReactNode }) {
  return (
    <div className="animate-fade-up" style={{ animationDelay: `${index * 70}ms` }}>
      {children}
    </div>
  )
}

/** The original Figma screen (node 188:70) — kept pixel-faithful. */
export default function ClassicHome() {
  const s = snapshot

  return (
    <div className="min-h-dvh bg-[#f8f9fa] font-sans">
      <div className="relative mx-auto min-h-dvh w-full max-w-[430px] bg-white shadow-[0_0_40px_rgba(0,0,0,0.08)]">
        <TopBar />
        <main>
          <HeroHeader userName={s.user.name} />
          <div className="flex flex-col gap-3 px-4 pt-6 pb-[max(32px,env(safe-area-inset-bottom))]">
            <Reveal index={0}>
              <WeatherCard tempC={s.weather.tempC} site={s.site.name} summary={s.weather.summary} />
            </Reveal>
            <Reveal index={1}>
              <div className="flex items-stretch gap-2">
                <PopulationCard totalLakh={s.population.totalLakh} split={s.population.split} />
                <div className="flex min-w-0 basis-1/2 flex-col gap-2">
                  <MiniStatCard value={s.natality.value} label="Natality" trend={s.natality.trend} color="secondary" />
                  <MiniStatCard value={s.mortality.value} label="Mortality" trend={s.mortality.trend} color="tertiary" />
                </div>
              </div>
            </Reveal>
            <Reveal index={2}>
              <ModuleRow
                icon={iconCaring}
                iconSize={30}
                title="Health & Medical"
                subtitle={`${s.medical.hospitalised} Hospitalised`}
                value={s.medical.sick}
                valueLabel="Sick Animals"
                bg="surface-variant"
              />
            </Reveal>
            <Reveal index={3}>
              <ModuleRow
                icon={iconEgg}
                iconSize={36}
                title="Eggs"
                subtitle={`${s.eggs.incubating} Under Incubation`}
                value={s.eggs.collected}
                valueLabel="Collected"
                bg="secondary-container"
              />
            </Reveal>
            <Reveal index={4}>
              <ApprovalsCard approvals={s.approvals} />
            </Reveal>
            <Reveal index={5}>
              <QuickActions />
            </Reveal>
          </div>
        </main>
      </div>
    </div>
  )
}
