import {
  AlertTriangle,
  BarChart3,
  CalendarCheck,
  CircleDollarSign,
  ClipboardList,
  MessagesSquare,
  Map,
  PackageSearch,
  Settings,
  Users,
} from "lucide-react";
import Link from "next/link";

import { Brand } from "@/components/brand";
import { cn } from "@/lib/utils";

const navigation = [
  { key: "overview", label: "Overview", href: "/admin", icon: BarChart3 },
  {
    key: "inquiries",
    label: "Inquiries",
    href: "/admin/leads",
    icon: ClipboardList,
  },
  {
    key: "reservations",
    label: "Reservations",
    href: "/admin/reservations",
    icon: CalendarCheck,
  },
  {
    key: "guest-list",
    label: "Guest List",
    href: "/admin/guest-list",
    icon: Users,
  },
  {
    key: "follow-ups",
    label: "Follow-ups",
    href: "/admin/follow-ups",
    icon: AlertTriangle,
  },
  {
    key: "conversations",
    label: "Conversations",
    href: "/admin/conversations",
    icon: MessagesSquare,
  },
  {
    key: "revenue",
    label: "Revenue",
    href: "/admin/revenue",
    icon: CircleDollarSign,
  },
  { key: "tables", label: "Table map", href: "/admin/tables", icon: Map },
  {
    key: "lost-found",
    label: "Lost & found",
    href: "/admin/lost-found",
    icon: PackageSearch,
  },
  {
    key: "settings",
    label: "Settings",
    href: "/admin/settings",
    icon: Settings,
  },
] as const;

export function AdminShell({
  active,
  children,
}: {
  active: (typeof navigation)[number]["key"];
  children: React.ReactNode;
}) {
  return (
    <main
      className={cn(
        "relative min-h-svh overflow-x-clip",
        active === "conversations" && "h-dvh min-h-0 overflow-hidden",
      )}
    >
      <div className="admin-orb admin-orb-one" aria-hidden="true" />
      <div className="admin-orb admin-orb-two" aria-hidden="true" />

      <aside className="border-border bg-canvas/95 fixed inset-y-0 left-0 z-40 hidden w-56 flex-col border-r px-3 py-5 backdrop-blur-xl xl:flex">
        <div className="border-border border-b px-3 pb-5">
          <Brand compact />
          <p className="text-muted mt-3 text-[10px] font-semibold tracking-[0.2em] uppercase">
            Manager workspace
          </p>
        </div>
        <nav
          className="mt-5 flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto"
          aria-label="Admin navigation"
        >
          {navigation.map((item) => {
            const Icon = item.icon;
            const selected = active === item.key;
            return (
              <Link
                key={item.key}
                href={item.href}
                aria-current={selected ? "page" : undefined}
                className={cn(
                  "focus-ring inline-flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors",
                  selected
                    ? "border-violet bg-violet/20 text-foreground border-l-2"
                    : "text-muted hover:bg-elevated hover:text-foreground",
                )}
              >
                <Icon size={17} aria-hidden="true" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <header className="border-border/80 bg-canvas/90 fixed inset-x-0 top-0 z-40 border-b backdrop-blur-xl xl:hidden">
        <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between gap-4">
            <Brand compact />

          </div>

          <nav
            className="flex gap-2 overflow-x-auto pb-3"
            aria-label="Admin navigation"
          >
            {navigation.map((item) => {
              const Icon = item.icon;
              const selected = active === item.key;
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  aria-current={selected ? "page" : undefined}
                  className={cn(
                    "focus-ring inline-flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-xl border px-2.5 text-xs font-medium",
                    selected
                      ? "border-violet bg-violet/10 text-foreground"
                      : "border-border bg-surface text-muted",
                  )}
                >
                  <Icon size={14} aria-hidden="true" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      <div
        className={cn(
          "relative mx-auto max-w-[1800px] px-4 pt-32 pb-8 sm:px-6 lg:px-8 xl:ml-56 xl:px-6 xl:pt-6",
          active === "conversations" &&
            "flex h-dvh min-h-0 flex-col overflow-hidden px-2 pt-30 pb-2 sm:px-4 lg:px-6 xl:px-3 xl:pt-3 xl:pb-3",
        )}
      >
        {children}
      </div>
    </main>
  );
}
