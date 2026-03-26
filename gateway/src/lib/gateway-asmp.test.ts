import fs from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("gateway-asmp (ASMP handler)", () => {
  let tmp: string;
  let handleAsmpRequest: typeof import("./gateway-asmp").handleAsmpRequest;

  beforeEach(async () => {
    tmp = path.join(tmpdir(), `haath-asmp-${process.pid}-${Date.now()}`);
    process.env.HAATH_DATA_DIR = tmp;
    await fs.mkdir(tmp, { recursive: true });
    await fs.writeFile(
      path.join(tmp, "haath.json"),
      JSON.stringify({
        version: 1,
        agent: { name: "TestAgent", asmpBaseUrl: "", notes: "" },
        waterfall: { enabled: false, gatewayUrl: "" },
      }),
      "utf8",
    );
    vi.resetModules();
    ({ handleAsmpRequest } = await import("./gateway-asmp"));
  });

  afterEach(async () => {
    delete process.env.HAATH_DATA_DIR;
    try {
      await fs.rm(tmp, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  });

  const base = "http://127.0.0.1:28657";

  async function startRun(): Promise<string> {
    const res = await handleAsmpRequest(
      new Request(`${base}/asmp/runs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: {} }),
      }),
    );
    expect(res.status).toBe(201);
    const frame = (await res.json()) as { run_id: string; state: string };
    expect(frame.state).toBe("HOME");
    return frame.run_id;
  }

  it("POST /asmp/runs creates HOME frame with workflow id", async () => {
    const runId = await startRun();
    expect(runId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
    const get = await handleAsmpRequest(
      new Request(`${base}/asmp/runs/${runId}`),
    );
    expect(get.status).toBe(200);
    const frame = (await get.json()) as {
      workflow_id: string;
      state: string;
      next_states: { action: string }[];
    };
    expect(frame.workflow_id).toBe("haath-gateway-config");
    expect(frame.state).toBe("HOME");
    expect(frame.next_states.map((n) => n.action).sort()).toEqual(
      ["go_agent", "go_waterfall"].sort(),
    );
  });

  it("GET /asmp/runs/:id/cli returns ASMP CLI options", async () => {
    const runId = await startRun();
    const res = await handleAsmpRequest(
      new Request(`${base}/asmp/runs/${runId}/cli`),
    );
    expect(res.status).toBe(200);
    const cli = (await res.json()) as {
      run_id: string;
      options: { action: string }[];
      hint: string;
    };
    expect(cli.run_id).toBe(runId);
    expect(cli.options.some((o) => o.action === "go_agent")).toBe(true);
    expect(cli.hint.length).toBeGreaterThan(10);
  });

  it("transition go_agent moves to AGENT state", async () => {
    const runId = await startRun();
    const res = await handleAsmpRequest(
      new Request(`${base}/asmp/runs/${runId}/transitions/go_agent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      }),
    );
    expect(res.status).toBe(200);
    const frame = (await res.json()) as { state: string };
    expect(frame.state).toBe("AGENT");
  });

  it("invoke bootstrap loads config into run data", async () => {
    const runId = await startRun();
    const res = await handleAsmpRequest(
      new Request(`${base}/asmp/runs/${runId}/invoke/bootstrap`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      }),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      result: { ok: boolean; config: { agent: { name: string } } };
    };
    expect(body.result.ok).toBe(true);
    expect(body.result.config.agent.name).toBe("TestAgent");
  });

  it("GET resource haath.json returns application/json", async () => {
    const runId = await startRun();
    const res = await handleAsmpRequest(
      new Request(`${base}/asmp/runs/${runId}/resources/haath.json`),
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/json");
    const json = (await res.json()) as { agent: { name: string } };
    expect(json.agent.name).toBe("TestAgent");
  });
});
