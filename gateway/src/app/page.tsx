import { GatewayDashboard } from "@/components/gateway-dashboard";

export default function Home() {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 bg-white/80 px-6 py-4 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/80">
        <h1 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Haath Agent Gateway
        </h1>
        <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
          Control plane and configuration for the Haath autonomous agent.
        </p>
      </header>
      <main className="flex flex-1 flex-col px-6 py-10">
        <GatewayDashboard />
      </main>
    </div>
  );
}
