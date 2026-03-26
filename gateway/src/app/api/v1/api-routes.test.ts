import fs from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { GET as getConfig, PATCH as patchConfig, PUT as putConfig } from "./config/route";
import { GET as getAgent, PATCH as patchAgent } from "./config/agent/route";
import { GET as getWaterfall, PATCH as patchWaterfall } from "./config/waterfall/route";
import { GET as getHealth } from "./health/route";
import { GET as getMeta } from "./meta/route";

describe("API v1 routes", () => {
  let tmp: string;

  beforeEach(async () => {
    tmp = path.join(tmpdir(), `haath-api-${process.pid}-${Date.now()}`);
    process.env.HAATH_DATA_DIR = tmp;
  });

  afterEach(async () => {
    delete process.env.HAATH_DATA_DIR;
    try {
      await fs.rm(tmp, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  });

  it("GET /api/v1/config returns defaults", async () => {
    const res = await getConfig();
    expect(res.status).toBe(200);
    const j = (await res.json()) as { agent: { name: string } };
    expect(j.agent.name).toBe("Haath");
  });

  it("PUT /api/v1/config replaces document", async () => {
    const body = {
      version: 1,
      agent: { name: "Z", asmpBaseUrl: "", notes: "" },
      waterfall: { enabled: true, gatewayUrl: "" },
    };
    const res = await putConfig(
      new Request("http://localhost/api/v1/config", {
        method: "PUT",
        body: JSON.stringify(body),
        headers: { "Content-Type": "application/json" },
      }),
    );
    expect(res.status).toBe(200);
    const j = (await res.json()) as { agent: { name: string } };
    expect(j.agent.name).toBe("Z");
    expect(j.waterfall.enabled).toBe(true);
  });

  it("PATCH /api/v1/config merges", async () => {
    const put = await putConfig(
      new Request("http://localhost/api/v1/config", {
        method: "PUT",
        body: JSON.stringify({
          version: 1,
          agent: { name: "A", asmpBaseUrl: "", notes: "" },
          waterfall: { enabled: false, gatewayUrl: "" },
        }),
        headers: { "Content-Type": "application/json" },
      }),
    );
    expect(put.status).toBe(200);

    const res = await patchConfig(
      new Request("http://localhost/api/v1/config", {
        method: "PATCH",
        body: JSON.stringify({ agent: { notes: "patched" } }),
        headers: { "Content-Type": "application/json" },
      }),
    );
    expect(res.status).toBe(200);
    const j = (await res.json()) as { agent: { name: string; notes: string } };
    expect(j.agent.name).toBe("A");
    expect(j.agent.notes).toBe("patched");
  });

  it("GET/PATCH /api/v1/config/agent", async () => {
    await putConfig(
      new Request("http://localhost/", {
        method: "PUT",
        body: JSON.stringify({
          version: 1,
          agent: { name: "B", asmpBaseUrl: "http://x.test", notes: "" },
          waterfall: { enabled: false, gatewayUrl: "" },
        }),
        headers: { "Content-Type": "application/json" },
      }),
    );

    const g = await getAgent();
    expect((await g.json()) as { name: string }).toMatchObject({ name: "B" });

    const p = await patchAgent(
      new Request("http://localhost/", {
        method: "PATCH",
        body: JSON.stringify({ notes: "n" }),
        headers: { "Content-Type": "application/json" },
      }),
    );
    expect(p.status).toBe(200);
    expect((await p.json()) as { name: string; notes: string }).toMatchObject({
      name: "B",
      notes: "n",
    });
  });

  it("GET/PATCH /api/v1/config/waterfall", async () => {
    await putConfig(
      new Request("http://localhost/", {
        method: "PUT",
        body: JSON.stringify({
          version: 1,
          agent: { name: "C", asmpBaseUrl: "", notes: "" },
          waterfall: { enabled: false, gatewayUrl: "" },
        }),
        headers: { "Content-Type": "application/json" },
      }),
    );

    const p = await patchWaterfall(
      new Request("http://localhost/", {
        method: "PATCH",
        body: JSON.stringify({ enabled: true }),
        headers: { "Content-Type": "application/json" },
      }),
    );
    expect(p.status).toBe(200);
    const w = (await p.json()) as { enabled: boolean };
    expect(w.enabled).toBe(true);

    const g = await getWaterfall();
    expect((await g.json()) as { enabled: boolean }).toEqual({ enabled: true, gatewayUrl: "" });
  });

  it("GET /api/v1/health", async () => {
    const res = await getHealth();
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, service: "haath-gateway" });
  });

  it("GET /api/v1/meta includes asmp and api map", async () => {
    const res = await getMeta(
      new Request("http://localhost:28657/api/v1/meta", {
        headers: { host: "localhost:28657" },
      }),
    );
    expect(res.status).toBe(200);
    const j = (await res.json()) as {
      gatewayPort: number;
      asmp: { publicBaseUrl: string; clrunDocsUrl: string };
      api: { v1: Record<string, string> };
    };
    expect(j.gatewayPort).toBe(28657);
    expect(j.asmp.publicBaseUrl).toContain("/asmp");
    expect(j.asmp.publicBaseUrl).toMatch(/^https?:\/\//);
    expect(j.asmp.clrunDocsUrl).toContain("clrun");
    expect(j.api.v1.config).toBe("/api/v1/config");
  });
});
