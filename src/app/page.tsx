import {
  ArrowRight,
  CalendarDays,
  Clock3,
  Crown,
  LockKeyhole,
  MapPin,
  Martini,
  Music2,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { Brand } from "@/components/brand";
import { AmbientVideo } from "@/components/landing/ambient-video";
import { LandingMotion } from "@/components/landing/landing-motion";
import { ThemeToggle } from "@/components/theme-toggle";
import { WebsiteChat } from "@/components/landing/website-chat";

const nights = [
  {
    day: "Friday",
    title: "Friday After Dark",
    music: "Hip-hop · R&B · Afrobeats",
    time: "10 PM — 3 AM",
    image: "/media/promotr-friday-night.webp.jpeg",
  },
  {
    day: "Saturday",
    title: "Saturday Energy",
    music: "Top 40 · Party anthems · Afrobeats",
    time: "10 PM — 3 AM",
    image: "/media/promotr-saturday-night.webp.jpeg",
  },
];

const experiences = [
  {
    icon: Users,
    title: "Guest list",
    text: "Free cover when everyone in your party arrives before 11 PM. Entry remains subject to door policies.",
    image: "/media/promotr-arrival.webp.jpeg",
  },
  {
    icon: Crown,
    title: "VIP tables",
    text: "High tops for up to 5 or booths for up to 10, with table minimums and dedicated service.",
    image: "/media/promotr-vip-experience.webp.jpeg",
  },
  {
    icon: Martini,
    title: "Bottle service",
    text: "Choose your bottle preference and let our team shape the right experience.",
    image: "/media/promotr-venue-interior.webp.jpeg",
  },
];

export default function LandingPage() {
  return (
    <main className="bg-[#05050a] text-white">
      <WebsiteChat />
      <LandingMotion />
      <section className="relative overflow-hidden xl:min-h-svh">
        <AmbientVideo
          src="/media/promotr-hero-nightclub.mp4"
          poster="/images/promotr-nightclub-hero-v2.png"
          eager
          className="absolute inset-0 size-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(3,3,9,.97)_0%,rgba(3,3,9,.82)_35%,rgba(3,3,9,.25)_72%,rgba(3,3,9,.45)_100%)]" />
        <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-[#05050a] to-transparent" />

        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <header className="flex min-h-20 items-center justify-between border-b border-white/15">
            <Brand compact />
            <nav className="hidden items-center gap-7 text-xs font-semibold tracking-[.12em] text-white/75 uppercase md:flex">
              <a href="#nights" className="transition hover:text-white">
                Nights
              </a>
              <a href="#experience" className="transition hover:text-white">
                Experience
              </a>
              <a href="#visit" className="transition hover:text-white">
                Visit
              </a>
            </nav>
            <div className="flex items-center gap-2">
              <Link
                href="/admin/login"
                aria-label="Admin login"
                className="focus-ring grid size-10 place-items-center rounded-full border border-white/20 bg-black/25 text-white/75 backdrop-blur-md transition hover:text-white"
              >
                <LockKeyhole size={16} />
              </Link>
              <ThemeToggle />
            </div>
          </header>

          <div
            className="flex max-w-3xl flex-col justify-start pt-4 pb-10 sm:pt-10 lg:pt-4 xl:min-h-[calc(100svh-5rem)]"
            data-reveal
          >
            <div className="mb-5 flex items-center gap-3 text-xs font-semibold tracking-[.22em] text-fuchsia-300 uppercase">
              <span className="h-px bg-fuchsia-400" /> 123 King Street West
            </div>
            <h1 className="text-5xl leading-[.92] font-black tracking-[-.065em] sm:text-7xl lg:text-[6.8rem]">
              Own the night.
              <span className="block bg-gradient-to-r from-fuchsia-300 via-violet-300 to-blue-300 bg-clip-text pb-[0.18em] text-transparent">
                Remember the feeling.
              </span>
            </h1>
            <p className="mt-7 max-w-xl text-base leading-7 text-white/72 sm:text-lg">
              Big sound, electric energy, and elevated table service in the
              heart of Toronto. Bring your people. we’ll take care of the night.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/book"
                className="focus-ring inline-flex min-h-13 items-center justify-center gap-2 rounded-full bg-white px-6 text-sm font-bold text-black transition hover:bg-fuchsia-100"
              >
                Plan your night <ArrowRight size={17} />
              </Link>
              <a
                href="#nights"
                className="focus-ring inline-flex min-h-13 items-center justify-center rounded-full border border-white/30 bg-white/8 px-6 text-sm font-semibold text-white backdrop-blur-md transition hover:bg-white/15"
              >
                Explore the venue
              </a>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-8 gap-y-3 text-xs text-white/62">
              <span className="flex items-center gap-2">
                <Clock3 size={15} className="text-violet-300" />
                Thu-Sat · 10 PM-3 AM
              </span>
              <span className="flex items-center gap-2">
                <ShieldCheck size={15} className="text-violet-300" />
                19+ · Valid ID required
              </span>
            </div>
          </div>
        </div>
      </section>

      <section
        id="nights"
        className="relative mx-auto max-w-7xl px-4 py-24 pt-12 sm:px-6 lg:px-8 lg:pt-24"
      >
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <p className="text-xs font-bold tracking-[.2em] text-fuchsia-400 uppercase">
              This is your weekend
            </p>
            <h2 className="mt-3 text-4xl font-bold tracking-[-.04em] sm:text-6xl">
              Two nights. One energy.
            </h2>
          </div>
          <p className="max-w-md text-sm leading-6 text-white/58">
            Music formats can vary for special events. Send an inquiry and our
            team will help you plan the right night.
          </p>
        </div>
        <div className="mt-12 grid gap-5 lg:grid-cols-2">
          {nights.map((night, index) => (
            <article
              key={night.day}
              data-reveal
              className="night-card group relative min-h-[28rem] overflow-hidden rounded-[2rem] p-7 sm:p-9"
            >
              <Image
                src={night.image}
                alt={`${night.day} nightlife at Promotr`}
                fill
                sizes="(min-width: 1024px) 50vw, 100vw"
                className="object-cover transition duration-1000 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/25 to-black/10" />
              <div className="absolute -right-16 -bottom-20 size-72 rounded-full border-[40px] border-white/8 transition duration-700 group-hover:scale-110" />
              <div className="relative flex h-full flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="rounded-full border border-white/25 bg-black/15 px-3 py-1 text-xs font-bold tracking-widest uppercase">
                    {night.day}
                  </span>
                  <span className="text-7xl font-black text-white/10">
                    0{index + 1}
                  </span>
                </div>
                <div>
                  <Music2 className="mb-4 text-white/70" />
                  <h3 className="text-3xl font-bold tracking-tight sm:text-4xl">
                    {night.title}
                  </h3>
                  <p className="mt-3 text-white/72">{night.music}</p>
                  <p className="mt-2 text-sm text-white/55">{night.time}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section
        className="relative isolate overflow-hidden border-y border-white/10 xl:min-h-[70svh]"
        data-reveal
      >
        <AmbientVideo
          src="/media/promotr-vip-table.mp4"
          poster="/media/promotr-vip-experience.webp.jpeg"
          className="absolute inset-0 size-full object-cover"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(5,5,10,.94),rgba(5,5,10,.58)_55%,rgba(5,5,10,.2))]" />
        <div className="relative mx-auto flex max-w-7xl items-start px-4 py-16 sm:px-6 sm:py-20 lg:px-8 xl:min-h-[70svh] xl:items-center xl:py-24">
          <div className="max-w-xl">
            <p className="text-xs font-bold tracking-[.2em] text-fuchsia-300 uppercase">
              Elevate the celebration
            </p>
            <h2 className="mt-4 text-4xl font-bold tracking-[-.045em] sm:text-6xl">
              Your table.
              <br />
              Your moment.
            </h2>
            <p className="mt-6 max-w-lg leading-7 text-white/68">
              Celebrate together with dedicated service, bottle selections,
              premium seating, and a view of the energy around you.
            </p>
            <Link
              href="/book"
              className="focus-ring mt-8 inline-flex min-h-13 items-center gap-2 rounded-full bg-white px-6 text-sm font-bold text-black"
            >
              Explore VIP tables <ArrowRight size={17} />
            </Link>
          </div>
        </div>
      </section>

      <section
        id="experience"
        className="border-y border-white/10 bg-gradient-to-b from-violet-950/30 to-[#080810]"
      >
        <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
          <div className="text-center" data-reveal>
            <Sparkles className="mx-auto text-fuchsia-400" />
            <p className="mt-4 text-xs font-bold tracking-[.2em] text-fuchsia-400 uppercase">
              Choose your experience
            </p>
            <h2 className="mt-3 text-4xl font-bold tracking-[-.04em] sm:text-6xl">
              Make the night yours.
            </h2>
          </div>
          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {experiences.map(({ icon: Icon, title, text, image }) => (
              <article
                key={title}
                data-reveal
                className="experience-card group overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/[.045] backdrop-blur-sm"
              >
                <div className="relative aspect-[4/3] overflow-hidden">
                  <Image
                    src={image}
                    alt={`${title} at Promotr`}
                    fill
                    sizes="(min-width: 768px) 33vw, 100vw"
                    className="object-cover transition duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                </div>
                <div className="p-6">
                  <span className="grid size-11 place-items-center rounded-2xl bg-gradient-to-br from-fuchsia-500 to-violet-700">
                    <Icon size={20} />
                  </span>
                  <h3 className="mt-5 text-xl font-bold">{title}</h3>
                  <p className="mt-3 text-sm leading-6 text-white/58">{text}</p>
                </div>
              </article>
            ))}
          </div>
          <div className="mt-10 text-center">
            <Link
              href="/book"
              className="focus-ring inline-flex min-h-13 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-fuchsia-500 to-violet-600 px-7 text-sm font-bold shadow-[0_18px_60px_rgba(168,85,247,.28)]"
            >
              Request guest list or a table <ArrowRight size={17} />
            </Link>
            <p className="mt-4 text-xs text-white/45">
              Requests are subject to availability and venue confirmation.
            </p>
          </div>
        </div>
      </section>

      <section
        className="relative mx-auto max-w-7xl overflow-hidden px-4 py-10 sm:px-6 sm:py-24 lg:px-8"
        data-reveal
      >
        <div className="relative min-h-[52svh] overflow-hidden rounded-[2.25rem] border border-white/10 sm:min-h-[56svh] xl:min-h-[72svh]">
          <AmbientVideo
            src="/media/promotr-dance-floor.mp4"
            poster="/media/promotr-venue-interior.webp.jpeg"
            className="absolute inset-0 size-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/15 to-black/20" />
          <div className="relative flex min-h-[52svh] flex-col items-center justify-end p-7 pb-12 text-center sm:min-h-[56svh] sm:p-14 xl:min-h-[72svh]">
            <p className="text-xs font-bold tracking-[.22em] text-fuchsia-300 uppercase">
              Feel the room
            </p>
            <h2 className="mt-3 max-w-3xl text-4xl font-black tracking-[-.05em] sm:text-7xl">
              Don’t just go out.
              <br />
              Go all in.
            </h2>
            <Link
              href="/book"
              className="focus-ring mt-7 inline-flex min-h-13 items-center gap-2 rounded-full bg-gradient-to-r from-fuchsia-500 to-violet-600 px-7 text-sm font-bold"
            >
              Plan your night <ArrowRight size={17} />
            </Link>
          </div>
        </div>
      </section>

      <section
        id="visit"
        className="mx-auto grid max-w-7xl gap-10 px-4 py-24 sm:px-6 lg:grid-cols-[1fr_.8fr] lg:px-8"
      >
        <div data-reveal>
          <p className="text-xs font-bold tracking-[.2em] text-fuchsia-400 uppercase">
            Before you arrive
          </p>
          <h2 className="mt-3 max-w-xl text-4xl font-bold tracking-[-.04em] sm:text-5xl">
            Dress up. Show up. Stay late.
          </h2>
          <p className="mt-5 max-w-xl leading-7 text-white/58">
            Upscale nightlife attire is recommended. Management and security
            have final discretion at the door, and entry is never guaranteed.
          </p>
        </div>
        <div
          className="relative min-h-96 overflow-hidden rounded-[2rem]"
          data-reveal
        >
          <Image
            src="/media/promotr-arrival.webp.jpeg"
            alt="Guests arriving for a night at Promotr"
            fill
            sizes="(min-width: 1024px) 45vw, 100vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent" />
          <div className="absolute inset-x-0 bottom-0 grid gap-2 p-5 sm:grid-cols-3 lg:grid-cols-1">
            {[
              {
                icon: MapPin,
                label: "Location",
                value: "123 King Street West",
              },
              { icon: CalendarDays, label: "Open", value: "Thursday-Saturday" },
              { icon: Clock3, label: "Hours", value: "10 PM — 3 AM" },
            ].map(({ icon: Icon, label, value }) => (
              <div
                key={label}
                className="flex items-center gap-3 rounded-2xl border border-white/15 bg-black/55 p-3 backdrop-blur-md"
              >
                <span className="grid size-10 place-items-center rounded-xl bg-violet-500/15 text-violet-300">
                  <Icon size={18} />
                </span>
                <div>
                  <p className="text-xs text-white/42">{label}</p>
                  <p className="mt-1 text-sm font-semibold">{value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Link
        href="/book"
        className="focus-ring fixed right-4 bottom-4 z-40 inline-flex min-h-12 items-center gap-2 rounded-full bg-white px-5 text-sm font-bold text-black shadow-2xl md:hidden"
      >
        Plan your night <ArrowRight size={16} />
      </Link>

      <footer className="border-t border-white/10 bg-gradient-to-b from-[#080810] to-black">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_.8fr_.8fr] lg:px-8">
          <div>
            <Brand />
            <p className="mt-5 max-w-sm text-sm leading-6 text-white/50">
              Toronto nightlife, elevated tables, and unforgettable weekends—all
              in one room.
            </p>
            <Link
              href="/book"
              className="focus-ring mt-6 inline-flex min-h-11 items-center gap-2 rounded-full bg-white px-5 text-sm font-bold text-black transition hover:bg-fuchsia-100"
            >
              Plan your night <ArrowRight size={16} />
            </Link>
          </div>
          <div>
            <p className="text-xs font-bold tracking-[.18em] text-white/40 uppercase">
              Explore
            </p>
            <nav className="mt-4 flex flex-col items-start gap-3 text-sm text-white/65">
              <a href="#nights" className="transition hover:text-white">
                Nights
              </a>
              <a href="#experience" className="transition hover:text-white">
                Experience
              </a>
              <a href="#visit" className="transition hover:text-white">
                Before you arrive
              </a>
            </nav>
          </div>
          <div>
            <p className="text-xs font-bold tracking-[.18em] text-white/40 uppercase">
              Venue
            </p>
            <div className="mt-4 space-y-3 text-sm text-white/65">
              <p>Thursday-Saturday</p>
              <p>10 PM—3 AM</p>
              <p>19+ · Valid ID required</p>
              <p>123 King Street West, Toronto</p>
            </div>
          </div>
        </div>
        <div className="border-t border-white/10">
          <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-5 text-xs text-white/35 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
            <p>© {new Date().getFullYear()} Promotr. All rights reserved.</p>
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              <Link href="/privacy" className="hover:text-white">
                Privacy policy
              </Link>
              <Link href="/data-deletion" className="hover:text-white">
                Data deletion
              </Link>
              <p>19+ only · Please enjoy responsibly.</p>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
