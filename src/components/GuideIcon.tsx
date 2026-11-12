// A small, original, non-human, non-governmental illustration used as the
// site's "guide" character: a friendly open-book shape with a simple face
// and a little leaf — deliberately not a lawyer figure, not a government
// emblem/seal, and not a generic AI-chat-bubble icon. Pure inline SVG (no
// external image asset, no licensing concerns), reused by GuideWidget and
// the About page's "Meet your guide" button so there is exactly one visual
// definition of the character.
export default function GuideIcon({ className = 'h-8 w-8' }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true" focusable="false">
      <circle cx="24" cy="24" r="22" fill="#0E6E66" />
      <path
        d="M24 14c-3.5-2.4-8-2.6-10.5-1.2-.6.3-1 1-1 1.7v13.8c0 1 1 1.6 1.9 1.1 2.6-1.4 6.8-1.2 9.6.9 2.8-2.1 7-2.3 9.6-.9.9.5 1.9-.1 1.9-1.1V14.5c0-.7-.4-1.4-1-1.7C32 11.4 27.5 11.6 24 14z"
        fill="#FBF6EE"
      />
      <path d="M24 14v16" stroke="#0E6E66" strokeWidth="1.2" strokeLinecap="round" />
      <circle cx="18.5" cy="19" r="1.4" fill="#1F2A24" />
      <circle cx="29.5" cy="19" r="1.4" fill="#1F2A24" />
      <path
        d="M20.5 22.5c1 1 2.5 1 3 0"
        stroke="#E8744C"
        strokeWidth="1.3"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M24 10c0-2 1.6-3.4 3.6-3.2-.4 2-2 3.3-3.6 3.2z"
        fill="#E8744C"
      />
    </svg>
  );
}
