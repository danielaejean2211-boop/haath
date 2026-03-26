import fs from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { GET, PUT } from "./route";

describe("legacy /api/haath", () => {
  let tmp: string;

  beforeEach(async () => {
    tmp = path.join(tmpdir(), `haath-legacy-${process.pid}-${Date.now()}`);
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

  it("GET and PUT round-trip", async () => {
    const put = await PUT(
      new Request("http://localhost/api/haath", {
        method: "PUT",
        body: JSON.stringify({
          version: 1,
          agent: { name: "Legacy", asmpBaseUrl: "", notes: "" },
          waterfall: { enabled: false, gatewayUrl: "" },
        }),
        headers: { "Content-Type": "application/json" },
      }),
    );
    expect(put.status).toBe(200);

    const get = await GET();
    expect(get.status).toBe(200);
    const j = (await get.json()) as { agent: { name: string } };
    expect(j.agent.name).toBe("Legacy");
  });
});
