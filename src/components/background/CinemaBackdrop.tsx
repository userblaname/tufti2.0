import React from 'react'

// Artistic movie-themed background with subtle filmstrips, vignette and spotlights
// Pure Tailwind + inline SVG, non-interactive, lightweight
export const CinemaBackdrop: React.FC = () => {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      {/* Base vertical focus gradient (darker sides, brighter center) */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(56,178,172,0.10)_0%,rgba(12,18,32,0.85)_45%,rgba(0,0,0,0.95)_100%)]" />

      {/* Left filmstrip column */}
      <svg className="absolute left-0 top-0 h-full w-[22vw] opacity-20" viewBox="0 0 180 1000" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="sideFilm" width="180" height="120" patternUnits="userSpaceOnUse">
            <rect width="180" height="120" fill="#0b0f19" />
            <rect x="24" y="0" width="132" height="120" fill="#161e2e" />
            <rect x="24" y="40" width="132" height="40" fill="#0b0f19" />
            {Array.from({ length: 4 }).map((_, i) => (
              <rect key={i} x={30 + i * 30} y={12} width="16" height="18" rx="2" fill="#0b0f19" />
            ))}
            {Array.from({ length: 4 }).map((_, i) => (
              <rect key={`b-${i}`} x={30 + i * 30} y={90} width="16" height="18" rx="2" fill="#0b0f19" />
            ))}
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#sideFilm)" />
      </svg>

      {/* Right filmstrip column (mirrored) */}
      <svg className="absolute right-0 top-0 h-full w-[22vw] opacity-20" viewBox="0 0 180 1000" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="sideFilmR" width="180" height="120" patternUnits="userSpaceOnUse">
            <rect width="180" height="120" fill="#0b0f19" />
            <rect x="24" y="0" width="132" height="120" fill="#161e2e" />
            <rect x="24" y="40" width="132" height="40" fill="#0b0f19" />
            {Array.from({ length: 4 }).map((_, i) => (
              <rect key={i} x={30 + i * 30} y={12} width="16" height="18" rx="2" fill="#0b0f19" />
            ))}
            {Array.from({ length: 4 }).map((_, i) => (
              <rect key={`b-${i}`} x={30 + i * 30} y={90} width="16" height="18" rx="2" fill="#0b0f19" />
            ))}
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#sideFilmR)" />
      </svg>

      {/* Soft center spotlight to draw attention to the sign-in card */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.08)_0%,rgba(255,255,255,0.02)_35%,rgba(0,0,0,0)_55%)]" />

      {/* Top teal bar like cinema light */}
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-teal-accent/10 via-teal-accent to-teal-accent/10" />
    </div>
  )
}

export default CinemaBackdrop


