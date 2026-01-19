import React from 'react'

// Artistic movie-themed background with subtle filmstrips, vignette and spotlights
// Pure Tailwind + inline SVG, non-interactive, lightweight
export const CinemaBackdrop: React.FC = () => {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      {/* Base vertical focus gradient (darker sides, brighter center) */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(56,178,172,0.12)_0%,rgba(12,18,32,0.9)_50%,rgba(0,0,0,1)_100%)]" />

      {/* Extreme vignette corners */}
      <div className="absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-black via-black/40 to-transparent opacity-80" />
      <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black via-black/40 to-transparent opacity-80" />

      {/* Left filmstrip column */}
      <svg className="absolute left-0 top-0 h-full w-[18vw] opacity-[0.12]" viewBox="0 0 180 1000" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="sideFilm" width="180" height="120" patternUnits="userSpaceOnUse">
            <rect width="180" height="120" fill="#05070a" />
            <rect x="24" y="0" width="132" height="120" fill="#0d131f" />
            <rect x="24" y="40" width="132" height="40" fill="#05070a" />
            {Array.from({ length: 4 }).map((_, i) => (
              <rect key={i} x={30 + i * 30} y={12} width="16" height="18" rx="2" fill="#05070a" />
            ))}
            {Array.from({ length: 4 }).map((_, i) => (
              <rect key={`b-${i}`} x={30 + i * 30} y={90} width="16" height="18" rx="2" fill="#05070a" />
            ))}
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#sideFilm)" />
      </svg>

      {/* Right filmstrip column (mirrored) */}
      <svg className="absolute right-0 top-0 h-full w-[18vw] opacity-[0.12]" viewBox="0 0 180 1000" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="sideFilmR" width="180" height="120" patternUnits="userSpaceOnUse">
            <rect width="180" height="120" fill="#05070a" />
            <rect x="24" y="0" width="132" height="120" fill="#0d131f" />
            <rect x="24" y="40" width="132" height="40" fill="#05070a" />
            {Array.from({ length: 4 }).map((_, i) => (
              <rect key={i} x={30 + i * 30} y={12} width="16" height="18" rx="2" fill="#05070a" />
            ))}
            {Array.from({ length: 4 }).map((_, i) => (
              <rect key={`b-${i}`} x={30 + i * 30} y={90} width="16" height="18" rx="2" fill="#05070a" />
            ))}
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#sideFilmR)" />
      </svg>

      {/* Soft center spotlight with breathing animation */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.12)_0%,rgba(255,255,255,0.03)_40%,rgba(0,0,0,0)_65%)] animate-ethereal-breathe" />

      {/* Top coral light beam (matches new accent) */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#D97757]/60 to-transparent" />
    </div>
  )
}

export default CinemaBackdrop


