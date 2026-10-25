import { businessHoursLabel } from "@/lib/menu-display";
import type { BusinessHour } from "@/lib/types";

export function SiteFooter({ businessHours }: { businessHours: BusinessHour[] | null }) {
  return (
    <footer className="mt-16 border-t-2 border-ink bg-paper">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-12 gap-y-4 px-4 pb-28 pt-8 sm:px-6 sm:pb-8">
        <p className="flex items-center gap-3 font-heading text-3xl font-black tracking-tight text-brand-red">
          {/* eslint-disable-next-line @next/next/no-img-element -- tiny static logo from /public */}
          <img src="/brand/chopstix-mark.webp" alt="" width={56} height={56} className="h-14 w-14 rounded-full" />
          Menciu&apos;s Chopstix
        </p>
        <ul className="flex flex-wrap gap-x-8 gap-y-2 text-lg font-bold text-ink">
          <li>6755 Hillcroft St, Houston</li>
          <li>Pickup only</li>
          <li>{businessHours ? businessHoursLabel(businessHours) : "Business hours are currently unavailable. Please refresh the page."}</li>
        </ul>
      </div>
    </footer>
  );
}
