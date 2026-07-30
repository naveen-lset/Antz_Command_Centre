import { greetingFor, useNow } from '../hooks/useNow'
import heroGraphic from '../assets/hero-graphic.png'

/** Wildlife hero with time-of-day greeting. */
export default function HeroHeader({ userName }: { userName: string }) {
  const now = useNow(60_000)

  return (
    <section className="relative h-[257px] w-full overflow-hidden rounded-b-[20px] bg-antz-hero">
      <img alt="" className="absolute inset-0 size-full object-cover object-bottom" src={heroGraphic} />
      <div className="absolute bottom-[13px] left-5 flex flex-col text-white">
        <p className="text-[18px] leading-[18px]">{greetingFor(now)}</p>
        <h1 className="font-display text-[32px] leading-[41px] font-bold tracking-[-1.44px]">{userName}</h1>
      </div>
    </section>
  )
}
