import type { CSSProperties } from 'react'

const flakes = Array.from({ length: 190 }, (_, index) => ({
  left: `${(index * 73.37 + 11) % 100}vw`,
  size: `${1 + index % 3}px`,
  delay: `${-((index * 7.13) % 29)}s`,
  duration: `${17 + index % 13}s`,
  drift: `${(index % 2 ? 1 : -1) * (18 + index % 47)}px`,
}))

export default function Snowfall() {
  return <div className="snowfall" aria-hidden="true">
    {flakes.map((flake, index) => <span key={index} className="snowflake" style={{
      '--flake-left': flake.left,
      '--flake-size': flake.size,
      '--flake-delay': flake.delay,
      '--flake-duration': flake.duration,
      '--flake-drift': flake.drift,
    } as CSSProperties} />)}
  </div>
}
