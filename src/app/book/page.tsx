import { CalendarDays, MapPin, ShieldCheck } from "lucide-react";

import { Brand } from "@/components/brand";
import { BookingForm } from "@/components/booking/booking-form";
import { ThemeToggle } from "@/components/theme-toggle";

const expectations = [
  { icon: MapPin, label: "Downtown Toronto" },
  { icon: CalendarDays, label: "Friday & Saturday · 10 PM–3 AM" },
  { icon: ShieldCheck, label: "19+ · Valid government ID required" },
];

export default function BookingPage() {
  return (
    <main className="relative min-h-svh overflow-hidden px-4 py-5 sm:px-6 lg:px-8">
      <div className="ambient-glow" aria-hidden="true" />
      <div className="relative mx-auto max-w-6xl">
        <header className="flex items-center justify-between py-2">
          <Brand />
          <ThemeToggle />
        </header>

        <section className="grid gap-7 py-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-start lg:gap-12 lg:py-16">
          <div className="pt-4 lg:sticky lg:top-8">
            <p className="eyebrow">YOUR NIGHT STARTS HERE</p>
            <h1 className="text-foreground mt-4 max-w-xl text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
              Tell us what you&apos;re planning.
            </h1>
            <p className="text-muted mt-5 max-w-lg text-base leading-7 sm:text-lg">
              Send the Promotr team your guest-list or table inquiry. We&apos;ll
              review the details and contact you to confirm what&apos;s
              available.
            </p>

            <ul className="mt-8 space-y-3" aria-label="Venue details">
              {expectations.map(({ icon: Icon, label }) => (
                <li
                  key={label}
                  className="text-muted flex items-center gap-3 text-sm"
                >
                  <span className="border-border bg-surface grid size-9 place-items-center rounded-xl border">
                    <Icon
                      className="text-violet"
                      size={17}
                      aria-hidden="true"
                    />
                  </span>
                  {label}
                </li>
              ))}
            </ul>
          </div>

          <div className="surface-card p-5 sm:p-8">
            <div className="mb-7">
              <p className="eyebrow">BOOKING INQUIRY</p>
              <h2 className="text-foreground mt-2 text-2xl font-semibold tracking-tight">
                Request your night
              </h2>
              <p className="text-muted mt-2 text-sm leading-6">
                This form sends an inquiry only. Entry, guest list, tables, and
                pricing are not guaranteed until the venue confirms them.
              </p>
            </div>
            <BookingForm />
          </div>
        </section>
      </div>
    </main>
  );
}
