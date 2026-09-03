import {
  AlertTriangle,
  BarChart3,
  CircleDollarSign,
  ClipboardList,
  ExternalLink,
  LogOut,
  MessagesSquare,
} from "lucide-react";
import Link from "next/link";

import { signOut } from "@/app/admin/login/actions";
import { Brand } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";
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
] as const;

export function AdminShell({
  active,
  children,
}: {
  active: (typeof navigation)[number]["key"];
  children: React.ReactNode;
}) {
  return (
    <main className="relative min-h-svh overflow-x-clip">
      <div className="admin-orb admin-orb-one" aria-hidden="true" />
      <div className="admin-orb admin-orb-two" aria-hidden="true" />

      <header className="border-border/80 bg-canvas/90 fixed inset-x-0 top-0 z-40 border-b backdrop-blur-xl">
        <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between gap-4 sm:h-20">
            <Brand compact />

            <nav
              className="hidden items-center gap-1.5 sm:flex"
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
                      "focus-ring inline-flex min-h-10 items-center gap-2 rounded-xl px-3.5 text-sm font-medium transition-colors",
                      selected
                        ? "bg-brand-gradient shadow-violet text-white"
                        : "text-muted hover:bg-elevated hover:text-foreground",
                    )}
                  >
                    <Icon size={16} aria-hidden="true" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="flex items-center gap-2">
              <Link
                className="focus-ring border-border bg-surface text-muted hover:text-foreground hidden min-h-10 items-center gap-2 rounded-xl border px-3 text-sm lg:inline-flex"
                href="/book"
                target="_blank"
              >
                <ExternalLink size={16} aria-hidden="true" />
                Booking form
              </Link>
              <ThemeToggle />
              <form action={signOut}>
                <button
                  className="focus-ring border-border bg-surface text-muted hover:text-foreground inline-flex min-h-10 items-center gap-2 rounded-xl border px-3 text-sm"
                  type="submit"
                  aria-label="Sign out"
                >
                  <LogOut size={16} aria-hidden="true" />
                  <span className="hidden lg:inline">Sign out</span>
                </button>
              </form>
            </div>
          </div>

          <nav
            className="flex gap-2 overflow-x-auto pb-3 sm:hidden"
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

      <div className="relative mx-auto max-w-[1600px] px-4 pt-36 pb-10 sm:px-6 sm:pt-28 lg:px-8">
        {children}
      </div>
    </main>
  );
}
