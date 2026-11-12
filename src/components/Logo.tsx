// Original logo mark for the header — an open book (the site's core
// metaphor: policies you can read and verify) with a small sun/chakra-style
// radial motif above it, echoing the Ashoka Chakra's spokes without
// reproducing the government emblem itself. Built entirely from basic SVG
// shapes in the existing teal/coral/saffron palette (see tailwind.config.ts)
// — no stock art, no imported icon set, no government insignia.
export default function LogoMark({ className = 'h-8 w-8' }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true" focusable="false">
      <circle cx="20" cy="20" r="19" fill="#FFFDF9" stroke="#0E6E66" strokeWidth="1.5" />
      {/* Radial spokes, evoking a chakra/sun without copying the national emblem */}
      <g stroke="#FF9933" strokeWidth="1.3" strokeLinecap="round">
        <path d="M20 6v4" />
        <path d="M20 30v4" />
        <path d="M6 20h4" />
        <path d="M30 20h4" />
        <path d="M10.3 10.3l2.8 2.8" />
        <path d="M26.9 26.9l2.8 2.8" />
        <path d="M29.7 10.3l-2.8 2.8" />
        <path d="M13.1 26.9l-2.8 2.8" />
      </g>
      {/* Open book */}
      <path
        d="M9 16c6-2.5 9-2.5 11 0 2-2.5 5-2.5 11 0v9c-6-2-9-2-11 0-2-2-5-2-11 0z"
        fill="#EAF5F3"
        stroke="#0E6E66"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M20 16v9" stroke="#0E6E66" strokeWidth="1.2" opacity="0.6" />
      <path d="M12 19.5h5.2M12 23h4.4" stroke="#0A534D" strokeOpacity="0.5" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M22.8 19.5H28M23.6 23H28" stroke="#0A534D" strokeOpacity="0.5" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}
