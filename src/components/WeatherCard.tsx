import CardShell from './CardShell'
import weatherBg from '../assets/weather-bg.jpg'
import weatherIcon from '../assets/weather-icon.png'

interface Props {
  tempC: number
  site: string
  summary: string
  onPress?: () => void
}

export default function WeatherCard({ tempC, site, summary, onPress }: Props) {
  return (
    <CardShell onPress={onPress} className="relative block w-full overflow-hidden rounded-2xl bg-[#121212]">
      {/* Figma crops to the photo's darker left band (679px placement, −96px offset) */}
      <img
        alt=""
        className="absolute top-[-120%] left-[-1%] h-[345%] w-[190%] max-w-none"
        src={weatherBg}
      />
      <div className="absolute inset-0 bg-black/25" aria-hidden />
      <div className="relative flex items-end justify-between p-4">
        <div className="flex items-end gap-6">
          <span className="text-[40px] leading-none font-light text-white">{tempC}°</span>
          <div className="flex flex-col gap-1">
            <span className="text-[16px] leading-5 text-white">{site}</span>
            <span className="text-[12px] leading-4 text-white/80">{summary}</span>
          </div>
        </div>
        <img alt="" className="size-12" src={weatherIcon} />
      </div>
    </CardShell>
  )
}
