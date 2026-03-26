"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Save, Server, Terminal } from "lucide-react";
import { HAATH_ASMP_BASE_PATH, HAATH_CONFIG_PATH, HAATH_GATEWAY_PORT } from "@/lib/constants";
import type { HaathConfig } from "@/lib/haath-store";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function GatewayDashboard() {
  const [config, setConfig] = useState<HaathConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(
    null,
  );
  const [asmpBaseUrl, setAsmpBaseUrl] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/v1/config");
      if (!res.ok) {
        const j = (await res.json()) as { error?: string };
        throw new Error(j.error ?? res.statusText);
      }
      const data = (await res.json()) as HaathConfig;
      setConfig(data);
    } catch (e) {
      setMessage({
        type: "err",
        text: e instanceof Error ? e.message : "Load failed",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/v1/meta");
        if (!res.ok) return;
        const m = (await res.json()) as { asmp?: { publicBaseUrl?: string } };
        if (m.asmp?.publicBaseUrl) setAsmpBaseUrl(m.asmp.publicBaseUrl);
      } catch {
        /* ignore */
      }
    })();
  }, []);

  const save = async () => {
    if (!config) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/v1/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          version: config.version,
          agent: config.agent,
          waterfall: config.waterfall,
        }),
      });
      if (!res.ok) {
        const j = (await res.json()) as { error?: string };
        throw new Error(j.error ?? res.statusText);
      }
      const data = (await res.json()) as HaathConfig;
      setConfig(data);
      setMessage({ type: "ok", text: "Saved to ~/.haath/haath.json" });
    } catch (e) {
      setMessage({
        type: "err",
        text: e instanceof Error ? e.message : "Save failed",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading && !config) {
    return (
      <div className="flex items-center justify-center gap-2 py-24 text-zinc-500">
        <Loader2 className="size-5 animate-spin" />
        Loading configuration…
      </div>
    );
  }

  if (!config) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
        {message?.text ?? "Could not load configuration."}
        <Button variant="outline" className="mt-3" onClick={() => void load()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-zinc-500">
          <Server className="size-4 shrink-0" />
          <span>
            API + dashboard on port{" "}
            <code className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-zinc-800 dark:bg-zinc-900 dark:text-zinc-200">
              {HAATH_GATEWAY_PORT}
            </code>
            <span className="mx-1 text-zinc-400">·</span>
            Config:{" "}
            <code className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-zinc-800 dark:bg-zinc-900 dark:text-zinc-200">
              {HAATH_CONFIG_PATH}
            </code>
          </span>
        </div>
        <Button onClick={() => void save()} disabled={saving}>
          {saving ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Save className="size-4" />
          )}
          Save
        </Button>
      </div>

      {message && (
        <p
          className={
            message.type === "ok"
              ? "text-sm text-emerald-700 dark:text-emerald-400"
              : "text-sm text-red-700 dark:text-red-400"
          }
        >
          {message.text}
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Terminal className="size-4" />
            ASMP + clrun
          </CardTitle>
          <CardDescription>
            This gateway embeds an ASMP server at{" "}
            <code className="rounded bg-zinc-100 px-1 font-mono text-zinc-800 dark:bg-zinc-900 dark:text-zinc-200">
              {HAATH_ASMP_BASE_PATH}
            </code>{" "}
            so agents can drive configuration through the same state machine and dynamic CLI as any other ASMP workflow.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
          {asmpBaseUrl && (
            <p>
              <span className="font-medium text-zinc-800 dark:text-zinc-200">
                ASMP base URL (clrun dynamic ASMP mode):
              </span>{" "}
              <code className="break-all rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-xs text-zinc-800 dark:bg-zinc-900 dark:text-zinc-200">
                {asmpBaseUrl}
              </code>
            </p>
          )}
          <p className="text-xs">
            REST:{" "}
            <code className="rounded bg-zinc-100 px-1 font-mono dark:bg-zinc-900">
              GET/PATCH /api/v1/config
            </code>
            ,{" "}
            <code className="rounded bg-zinc-100 px-1 font-mono dark:bg-zinc-900">
              /api/v1/config/agent
            </code>
            ,{" "}
            <code className="rounded bg-zinc-100 px-1 font-mono dark:bg-zinc-900">
              /api/v1/config/waterfall
            </code>
            ,{" "}
            <code className="rounded bg-zinc-100 px-1 font-mono dark:bg-zinc-900">
              /api/v1/meta
            </code>
            ,{" "}
            <code className="rounded bg-zinc-100 px-1 font-mono dark:bg-zinc-900">
              /api/v1/health
            </code>
            . Legacy{" "}
            <code className="rounded bg-zinc-100 px-1 font-mono dark:bg-zinc-900">
              /api/haath
            </code>{" "}
            still works.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Agent</CardTitle>
          <CardDescription>
            Identity and ASMP workflow server URL for this Haath instance.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid gap-2">
            <Label htmlFor="agent-name">Name</Label>
            <Input
              id="agent-name"
              value={config.agent.name}
              onChange={(e) =>
                setConfig({
                  ...config,
                  agent: { ...config.agent, name: e.target.value },
                })
              }
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="asmp-url">ASMP base URL</Label>
            <Input
              id="asmp-url"
              placeholder="http://localhost:8000"
              value={config.agent.asmpBaseUrl}
              onChange={(e) =>
                setConfig({
                  ...config,
                  agent: { ...config.agent, asmpBaseUrl: e.target.value },
                })
              }
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="notes">Notes</Label>
            <Input
              id="notes"
              placeholder="Optional operator notes"
              value={config.agent.notes}
              onChange={(e) =>
                setConfig({
                  ...config,
                  agent: { ...config.agent, notes: e.target.value },
                })
              }
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Waterfall LLM gateway</CardTitle>
          <CardDescription>
            Route model traffic through{" "}
            <a
              href="https://waterfall.finance"
              className="font-medium text-zinc-900 underline-offset-4 hover:underline dark:text-zinc-100"
              target="_blank"
              rel="noreferrer"
            >
              Waterfall
            </a>{" "}
            for spend visibility and automation.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <label className="flex cursor-pointer items-center gap-3 text-sm">
            <input
              type="checkbox"
              className="size-4 rounded border-zinc-300 dark:border-zinc-700"
              checked={config.waterfall.enabled}
              onChange={(e) =>
                setConfig({
                  ...config,
                  waterfall: {
                    ...config.waterfall,
                    enabled: e.target.checked,
                  },
                })
              }
            />
            <span className="font-medium text-zinc-900 dark:text-zinc-50">
              Use Waterfall gateway for LLM calls
            </span>
          </label>
          <div className="grid gap-2">
            <Label htmlFor="wf-url">Gateway URL</Label>
            <Input
              id="wf-url"
              placeholder="https://…"
              value={config.waterfall.gatewayUrl}
              onChange={(e) =>
                setConfig({
                  ...config,
                  waterfall: {
                    ...config.waterfall,
                    gatewayUrl: e.target.value,
                  },
                })
              }
            />
          </div>
        </CardContent>
      </Card>

      {config.updatedAt && (
        <p className="text-center text-xs text-zinc-400">
          Last written: {new Date(config.updatedAt).toLocaleString()}
        </p>
      )}
    </div>
  );
}
