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
import { ThemeToggle } from "@/components/theme-toggle";

const nights = [
  {
    day: "Friday",
    title: "Friday After Dark",
    music: "Hip-hop · R&B · Afrobeats",
    time: "10 PM — 3 AM",
    color: "from-fuchsia-600 via-purple-700 to-indigo-950",
  },
  {
    day: "Saturday",
    title: "Saturday Energy",
    music: "Top 40 · Party anthems · Afrobeats",
    time: "10 PM — 3 AM",
    color: "from-violet-500 via-blue-700 to-slate-950",
  },
];

const experiences = [
  {
    icon: Users,
    title: "Guest list",
    text: "Make your arrival easier on selected nights. Early arrival is recommended.",
  },
  {
    icon: Crown,
    title: "VIP tables",
    text: "Your own space, dedicated service, mixers, and priority entry for the group.",
  },
  {
    icon: Martini,
    title: "Bottle service",
    text: "Choose your bottle preference and let our team shape the right experience.",
  },
];

export default function LandingPage() {
  return (
    <main className="bg-[#05050a] text-white">
      <section className="relative min-h-svh overflow-hidden">
        <Image
          src="/images/promotr-nightclub-hero-v2.png"
          alt="A vibrant night at Promotr with a packed dance floor and violet lights"
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
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

          <div className="flex min-h-[calc(100svh-5rem)] max-w-3xl flex-col justify-center py-20">
            <div className="mb-5 flex items-center gap-3 text-xs font-semibold tracking-[.22em] text-fuchsia-300 uppercase">
              <span className="h-px w-10 bg-fuchsia-400" /> Downtown Toronto
            </div>
            <h1 className="text-5xl leading-[.92] font-black tracking-[-.065em] sm:text-7xl lg:text-[6.8rem]">
              Own the night.
              <span className="block bg-gradient-to-r from-fuchsia-300 via-violet-300 to-blue-300 bg-clip-text text-transparent">
                Remember the feeling.
              </span>
            </h1>
            <p className="mt-7 max-w-xl text-base leading-7 text-white/72 sm:text-lg">
              Big sound, electric energy, and elevated table service in the
              heart of Toronto. Bring your people—we’ll take care of the night.
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
            <div className="mt-12 flex flex-wrap gap-x-8 gap-y-3 text-xs text-white/62">
              <span className="flex items-center gap-2">
                <Clock3 size={15} className="text-violet-300" />
                Fri & Sat · 10 PM–3 AM
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
        className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8"
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
              className={`group relative min-h-80 overflow-hidden rounded-[2rem] bg-gradient-to-br ${night.color} p-7 sm:p-9`}
            >
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
        id="experience"
        className="border-y border-white/10 bg-gradient-to-b from-violet-950/30 to-[#080810]"
      >
        <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
          <div className="text-center">
            <Sparkles className="mx-auto text-fuchsia-400" />
            <p className="mt-4 text-xs font-bold tracking-[.2em] text-fuchsia-400 uppercase">
              Choose your experience
            </p>
            <h2 className="mt-3 text-4xl font-bold tracking-[-.04em] sm:text-6xl">
              Make the night yours.
            </h2>
          </div>
          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {experiences.map(({ icon: Icon, title, text }) => (
              <article
                key={title}
                className="rounded-[1.75rem] border border-white/10 bg-white/[.045] p-7 backdrop-blur-sm transition hover:-translate-y-1 hover:border-violet-400/40 hover:bg-white/[.07]"
              >
                <span className="grid size-12 place-items-center rounded-2xl bg-gradient-to-br from-fuchsia-500 to-violet-700">
                  <Icon size={21} />
                </span>
                <h3 className="mt-6 text-xl font-bold">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-white/58">{text}</p>
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
        id="visit"
        className="mx-auto grid max-w-7xl gap-10 px-4 py-24 sm:px-6 lg:grid-cols-[1fr_.8fr] lg:px-8"
      >
        <div>
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
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
          {[
            { icon: MapPin, label: "Location", value: "Downtown Toronto" },
            { icon: CalendarDays, label: "Open", value: "Friday & Saturday" },
            { icon: Clock3, label: "Hours", value: "10 PM — 3 AM" },
          ].map(({ icon: Icon, label, value }) => (
            <div
              key={label}
              className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[.035] p-4"
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
      </section>

      <footer className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <Brand compact />
          <p className="text-xs text-white/40">
            19+ only · Please enjoy responsibly
          </p>
          <Link href="/book" className="text-sm font-semibold text-violet-300">
            Plan your night →
          </Link>
        </div>
      </footer>
    </main>
  );
}
