/** Steaming bowl with crossed chopsticks, for the menu page's red hero band. Decorative only. */
export function HeroArt({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 300 220" fill="none" aria-hidden="true" className={className}>
      <circle cx="150" cy="118" r="98" fill="#b91c1c" />
      <path d="M84 40c-9 12 9 18 0 30M124 30c-9 12 9 18 0 30M164 40c-9 12 9 18 0 30" stroke="#fff" strokeWidth="7" strokeLinecap="round" />
      <path d="M44 108h212c0 54-44 94-106 94S44 162 44 108Z" fill="#fdf6ec" stroke="#1c1917" strokeWidth="6" strokeLinejoin="round" />
      <path d="M190.2 13.4 L205.8 2.6 L266.9 102 L261.1 106 Z" fill="#1c1917" />
      <path d="M264.9 5.7 L279.1 18.3 L198.6 100.3 L193.4 95.7 Z" fill="#1c1917" stroke="#b91c1c" strokeWidth="3" strokeLinejoin="round" />
    </svg>
  );
}
