import { MENU_PHOTOS } from "@/lib/menu-photos";

/** Dish photo, or a placeholder bowl tile until the restaurant's photo arrives. */
export function MenuThumb({ code }: { code: string }) {
  if (MENU_PHOTOS.has(code)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- small static photos from /public
      <img
        src={`/menu/${code}.jpg`}
        alt=""
        width={96}
        height={96}
        loading="lazy"
        className="h-20 w-20 shrink-0 rounded-lg object-cover sm:h-24 sm:w-24"
      />
    );
  }
  return (
    <div
      aria-hidden="true"
      className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg bg-tile text-brand-blue/50 sm:h-24 sm:w-24"
    >
      <svg viewBox="0 0 48 48" fill="none" className="h-9 w-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 22h36c0 9-7 16-18 16S6 31 6 22Z" />
        <path d="M18 16c0-3 3-3 3-6M26 16c0-3 3-3 3-6" />
        <path d="M32 6 40 18" />
      </svg>
    </div>
  );
}
