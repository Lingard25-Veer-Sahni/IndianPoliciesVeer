// An original, simple inline illustration for the homepage hero: an open
// book that idly floats/hovers, built entirely from basic shapes (no stock
// photography, no government emblem, no imported asset). The diya/flame
// that used to sit above the book has been removed per request; the book
// itself now carries the motion instead. (An earlier version also had the
// right-hand page periodically "turn", but that read as visually odd and
// was dropped per request — just the float remains.) Animation is a plain
// Tailwind-driven CSS keyframe (book-float in tailwind.config.ts) and
// respects prefers-reduced-motion via the global rule in globals.css.
export default function HeroIllustration() {
  return (
    <svg
      viewBox="0 0 320 240"
      className="mx-auto h-48 w-auto sm:h-56"
      aria-hidden="true"
      focusable="false"
    >
      <ellipse cx="160" cy="210" rx="120" ry="14" fill="#F5EBDA" />
      <g className="animate-book-float">
        <path
          d="M60 90c40-18 80-18 100 2 20-20 60-20 100-2v90c-40-16-80-16-100 2-20-18-60-18-100-2z"
          fill="#FFFDF9"
          stroke="#138808"
          strokeWidth="3"
        />
        <path d="M160 92v90" stroke="#138808" strokeWidth="2" opacity="0.5" />
        <path
          d="M78 108h58M78 126h50M78 144h56"
          stroke="#138808"
          strokeOpacity="0.35"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path
          d="M184 108h58M192 126h50M186 144h56"
          stroke="#138808"
          strokeOpacity="0.35"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
}
