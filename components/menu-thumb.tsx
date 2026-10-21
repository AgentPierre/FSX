import { MENU_PHOTOS } from "@/lib/menu-photos";

// Placeholder tiles rotate through warm tints by category so a page of cards isn't one flat colour.
const TONES = [
  "bg-tile text-brand-blue/45",
  "bg-[#f9d9d3] text-brand-red/45",
  "bg-[#dbe3f6] text-brand-blue/45",
  "bg-[#fbe5b0] text-ink/35",
];

/** Dish photo, or a placeholder bowl tile until the restaurant's photo arrives. */
export function MenuThumb({ code, tone = 0, className = "" }: { code: string; tone?: number; className?: string }) {
  if (MENU_PHOTOS.has(code)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- small static photos from /public
      <img src={`/menu/${code}.jpg`} alt="" loading="lazy" className={`object-cover ${className}`} />
    );
  }
  return (
    <div aria-hidden="true" className={`flex items-center justify-center ${TONES[tone % TONES.length]} ${className}`}>
      <svg viewBox="0 0 48 48" fill="none" className="h-1/2 max-h-16 w-1/2 max-w-16" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 22h36c0 9-7 16-18 16S6 31 6 22Z" />
        <path d="M18 16c0-3 3-3 3-6M26 16c0-3 3-3 3-6" />
        <path d="M32 6 40 18" />
      </svg>
    </div>
  );
}
