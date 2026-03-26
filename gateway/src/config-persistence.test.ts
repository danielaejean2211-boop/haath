import fs from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PUT as putConfig } from "@/app/api/v1/config/route";
import { PATCH as patchAgent } from "@/app/api/v1/config/agent/route";

async function readJsonFile(p: string): Promise<{ agent?: { name?: string } }> {
  const raw = await fs.readFile(p, "utf8");
  return JSON.parse(raw) as { agent?: { name?: string } };
}

describe("config persistence to haath.json on disk", () => {
  let tmp: string;
  let jsonPath: string;

  beforeEach(async () => {
    tmp = path.join(tmpdir(), `haath-persist-${process.pid}-${Date.now()}`);
    process.env.HAATH_DATA_DIR = tmp;
    jsonPath = path.join(tmp, "haath.json");
  });

  afterEach(async () => {
    delete process.env.HAATH_DATA_DIR;
    try {
      await fs.rm(tmp, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  });

  it("REST PUT /api/v1/config creates and updates haath.json", async () => {
    const res = await putConfig(
      new Request("http://localhost/api/v1/config", {
        method: "PUT",
        body: JSON.stringify({
          version: 1,
          agent: { name: "DiskApi", asmpBaseUrl: "", notes: "from-api" },
          waterfall: { enabled: false, gatewayUrl: "" },
        }),
        headers: { "Content-Type": "application/json" },
      }),
    );
    expect(res.status).toBe(200);

    const onDisk = await readJsonFile(jsonPath);
    expect(onDisk.agent?.name).toBe("DiskApi");

    const patchRes = await patchAgent(
      new Request("http://localhost/", {
        method: "PATCH",
        body: JSON.stringify({ name: "PatchedOnDisk" }),
        headers: { "Content-Type": "application/json" },
      }),
    );
    expect(patchRes.status).toBe(200);

    const afterPatch = await readJsonFile(jsonPath);
    expect(afterPatch.agent?.name).toBe("PatchedOnDisk");
  });

  it("ASMP replace_config tool writes haath.json", async () => {
    vi.resetModules();
    const { handleAsmpRequest } = await import("@/lib/gateway-asmp");

    const base = "http://127.0.0.1:28657";
    const start = await handleAsmpRequest(
      new Request(`${base}/asmp/runs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      }),
    );
    const { run_id: runId } = (await start.json()) as { run_id: string };

    const payload = {
      version: 1,
      agent: { name: "DiskAsmp", asmpBaseUrl: "", notes: "" },
      waterfall: { enabled: true, gatewayUrl: "" },
    };

    const inv = await handleAsmpRequest(
      new Request(`${base}/asmp/runs/${runId}/invoke/replace_config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }),
    );
    expect(inv.status).toBe(200);
    const body = (await inv.json()) as { result: { ok: boolean } };
    expect(body.result.ok).toBe(true);

    const onDisk = await readJsonFile(jsonPath);
    expect(onDisk.agent?.name).toBe("DiskAsmp");
    expect((onDisk as { waterfall?: { enabled?: boolean } }).waterfall?.enabled).toBe(
      true,
    );
  });
});
