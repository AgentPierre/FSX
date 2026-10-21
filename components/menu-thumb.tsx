import { MENU_PHOTOS } from "@/lib/menu-photos";

// Placeholder tiles rotate through four warm tints by category so a page of cards isn't one flat colour.
const TONES = [
  { bg: "#f1e6d0", ink: "#8a6a2f" },
  { bg: "#f9d9d3", ink: "#b91c1c" },
  { bg: "#dbe3f6", ink: "#1a3a8f" },
  { bg: "#fbe5b0", ink: "#7a5200" },
];

/**
 * Dish photo, or until the restaurant's photo arrives a tile with the item code in big outlined
 * letters (customers and staff already order by these codes).
 */
export function MenuThumb({ code, tone = 0, size = "card", className = "" }: {
  code: string; tone?: number; size?: "card" | "sheet"; className?: string;
}) {
  if (MENU_PHOTOS.has(code)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- small static photos from /public
      <img src={`/menu/${code}.jpg`} alt="" loading="lazy" className={`object-cover ${className}`} />
    );
  }
  const { bg, ink } = TONES[tone % TONES.length];
  return (
    <div aria-hidden="true" style={{ backgroundColor: bg }} className={`flex items-center justify-center overflow-hidden ${className}`}>
      <span
        className="font-heading font-black leading-none tracking-tighter"
        style={{
          fontSize: size === "sheet" ? "6rem" : "clamp(3.5rem, 8vw, 5.75rem)",
          color: "transparent",
          WebkitTextStroke: `2.5px ${ink}`,
          fontVariationSettings: '"SOFT" 100, "WONK" 1',
        }}
      >
        {code}
      </span>
    </div>
  );
}
