import { useNow } from '../hooks/useNow'
import vantaraLogo from '../assets/vantara-logo.png'

const two = (n: number) => String(n).padStart(2, '0')

/** Fixed brand bar: logo, live date and time over a black fade. */
export default function TopBar() {
  const now = useNow()
  const weekday = now.toLocaleDateString('en-GB', { weekday: 'short' })
  const dayMonth = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })

  return (
    <header className="fixed top-0 left-1/2 z-20 flex w-full max-w-[430px] -translate-x-1/2 items-center justify-between bg-gradient-to-b from-black from-[53%] to-black/0 p-4">
      <div className="relative h-10 w-[131px] overflow-hidden" aria-label="Vantara — Every Life Matters" role="img">
        <img
          alt=""
          className="absolute top-[-95.45%] left-[-12.84%] h-[290.91%] w-[125.68%] max-w-none"
          src={vantaraLogo}
        />
      </div>
      <div className="flex items-end gap-3 font-display text-white">
        <p className="pb-2 text-[14px] leading-[1.02] font-bold tracking-[-0.28px]">
          {weekday},
          <br />
          {dayMonth}
        </p>
        <p className="flex gap-1 py-[3px] text-[42px] leading-[0.82] tracking-[-1.89px]">
          <span className="sr-only">{`${two(now.getHours())}:${two(now.getMinutes())}`}</span>
          <span className="font-bold" aria-hidden>
            {two(now.getHours())}
          </span>
          <span className="font-normal" aria-hidden>
            {two(now.getMinutes())}
          </span>
        </p>
      </div>
    </header>
  )
}
