import { businessHoursLabel } from "@/lib/menu-display";
import type { BusinessHour } from "@/lib/types";

export function SiteFooter({ businessHours }: { businessHours: BusinessHour[] | null }) {
  return (
    <footer className="mt-16 border-t border-line bg-paper">
      <div className="mx-auto max-w-3xl px-4 py-8 text-sm text-muted sm:px-6">
        <p className="font-heading text-xl font-black text-brand-red">Menciu&apos;s Chopstix</p>
        <p className="mt-2">6755 Hillcroft St, Houston. Pickup only.</p>
        {businessHours && <p className="mt-1">{businessHoursLabel(businessHours)}</p>}
      </div>
    </footer>
  );
}
