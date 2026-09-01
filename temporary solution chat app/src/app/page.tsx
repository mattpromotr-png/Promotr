import { Chat } from "@/components/chat";

export default function HomePage() {
  return (
    <main className="page-shell">
      <div className="ambient" aria-hidden="true" />
      <Chat />
    </main>
  );
}
