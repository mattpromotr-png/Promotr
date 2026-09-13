"use client";

import { useEffect, useRef, useState } from "react";

export function NavigationFeedback() {
  const [loading, setLoading] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0) return;
      const target = event.target as Element | null;
      const anchor = target?.closest("a[href]") as HTMLAnchorElement | null;
      if (
        !anchor ||
        anchor.target === "_blank" ||
        anchor.hasAttribute("download") ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      const destination = new URL(anchor.href, window.location.href);
      if (
        destination.origin !== window.location.origin ||
        destination.href === window.location.href ||
        destination.hash
      )
        return;
      setLoading(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setLoading(false), 1500);
    }
    document.addEventListener("click", handleClick);
    return () => {
      document.removeEventListener("click", handleClick);
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  return loading ? (
    <div className="navigation-progress" role="status" aria-live="polite">
      <span className="sr-only">Loading page</span>
    </div>
  ) : null;
}
