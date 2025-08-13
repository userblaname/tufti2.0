import React from 'react'

// Artistic movie-themed background with subtle filmstrips, vignette and spotlights
// Pure Tailwind + inline SVG, non-interactive, lightweight
export const CinemaBackdrop: React.FC = () => {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      {/* Base gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-navy-deep via-[#0C1220] to-black opacity-95" />

      {/* Soft vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0)_0%,rgba(0,0,0,0)_45%,rgba(0,0,0,0.45)_100%)]" />

      {/* Spotlights */}
      <div className="absolute -top-1/3 -left-1/4 w-[70vw] h-[70vw] rounded-full bg-[radial-gradient(circle_at_50%_50%,rgba(56,178,172,0.20),rgba(56,178,172,0)_60%)] blur-3xl animate-pulse" />
      <div className="absolute -bottom-1/3 -right-1/4 w-[70vw] h-[70vw] rounded-full bg-[radial-gradient(circle_at_50%_50%,rgba(199,53,46,0.10),rgba(199,53,46,0)_60%)] blur-3xl animate-[pulse_8s_ease-in-out_infinite]" />

      {/* Filmstrip diagonals (two layers) */}
      <svg className="absolute -left-24 -top-16 w-[140%] h-[140%] rotate-[18deg] opacity-[0.06]" viewBox="0 0 1200 800" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="film" width="180" height="120" patternUnits="userSpaceOnUse">
            <rect width="180" height="120" fill="white" />
            <rect x="0" y="40" width="180" height="40" fill="black" />
            {Array.from({ length: 6 }).map((_, i) => (
              <rect key={i} x={10 + i * 28} y={10} width="14" height="20" fill="black" />
            ))}
            {Array.from({ length: 6 }).map((_, i) => (
              <rect key={`b-${i}`} x={10 + i * 28} y={90} width="14" height="20" fill="black" />
            ))}
          </pattern>
        </defs>
        <rect width="1200" height="800" fill="url(#film)" />
      </svg>
      <svg className="absolute -right-24 -bottom-16 w-[140%] h-[140%] -rotate-[18deg] opacity-[0.05]" viewBox="0 0 1200 800" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="film2" width="180" height="120" patternUnits="userSpaceOnUse">
            <rect width="180" height="120" fill="white" />
            <rect x="0" y="40" width="180" height="40" fill="white" />
            <rect x="0" y="40" width="180" height="40" fill="black" />
            {Array.from({ length: 6 }).map((_, i) => (
              <rect key={i} x={10 + i * 28} y={10} width="14" height="20" fill="black" />
            ))}
            {Array.from({ length: 6 }).map((_, i) => (
              <rect key={`b-${i}`} x={10 + i * 28} y={90} width="14" height="20" fill="black" />
            ))}
          </pattern>
        </defs>
        <rect width="1200" height="800" fill="url(#film2)" />
      </svg>

      {/* Top teal bar like cinema light */}
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-teal-accent/20 via-teal-accent to-teal-accent/20" />
    </div>
  )
}

export default CinemaBackdrop


