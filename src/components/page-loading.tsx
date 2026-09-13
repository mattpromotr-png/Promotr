import { LoaderCircle } from "lucide-react";

export function PageLoading() {
  return (
    <div className="bg-canvas/80 fixed inset-0 z-[100] grid place-items-center backdrop-blur-sm" role="status" aria-live="polite">
      <div className="surface-card flex items-center gap-3 px-5 py-4 text-sm font-medium">
        <LoaderCircle className="text-violet animate-spin" size={20} />
        Loading…
      </div>
    </div>
  );
}
