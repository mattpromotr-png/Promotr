import type { Metadata } from "next";
import { Suspense, type ReactNode } from "react";

import { NavigationFeedback } from "@/components/navigation-feedback";
import { ThemeProvider } from "@/components/theme-provider";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "The Promotr Lounge",
    template: "%s | Promotr",
  },
  description:
    "Booking inquiries for The Promotr Lounge at 123 King Street West, Toronto.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <Suspense fallback={null}>
            <NavigationFeedback />
          </Suspense>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
