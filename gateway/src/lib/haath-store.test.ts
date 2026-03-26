import fs from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  defaultHaathConfig,
  patchHaathConfig,
  readHaathConfig,
  resolveHaathPaths,
  writeHaathConfig,
} from "./haath-store";

describe("haath-store", () => {
  let tmp: string;

  beforeEach(async () => {
    tmp = path.join(tmpdir(), `haath-test-${process.pid}-${Date.now()}`);
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

  it("resolveHaathPaths uses HAATH_DATA_DIR", () => {
    const p = resolveHaathPaths();
    expect(p.haathDir).toBe(path.resolve(tmp));
    expect(p.haathJsonPath).toBe(path.join(path.resolve(tmp), "haath.json"));
  });

  it("readHaathConfig returns defaults when file missing", async () => {
    const c = await readHaathConfig();
    expect(c.version).toBe(1);
    expect(c.agent.name).toBe("Haath");
    expect(c.waterfall.enabled).toBe(false);
  });

  it("writeHaathConfig creates directory and file", async () => {
    const saved = await writeHaathConfig(defaultHaathConfig());
    expect(saved.updatedAt).toBeDefined();
    const raw = await fs.readFile(resolveHaathPaths().haathJsonPath, "utf8");
    const parsed = JSON.parse(raw) as { agent: { name: string } };
    expect(parsed.agent.name).toBe("Haath");
  });

  it("readHaathConfig reads written file", async () => {
    await writeHaathConfig({
      ...defaultHaathConfig(),
      agent: { name: "T", asmpBaseUrl: "", notes: "n" },
    });
    const c = await readHaathConfig();
    expect(c.agent.name).toBe("T");
    expect(c.agent.notes).toBe("n");
  });

  it("patchHaathConfig merges partial agent and waterfall", async () => {
    await writeHaathConfig(defaultHaathConfig());
    const next = await patchHaathConfig({
      agent: { notes: "x" },
      waterfall: { enabled: true, gatewayUrl: "" },
    });
    expect(next.agent.notes).toBe("x");
    expect(next.waterfall.enabled).toBe(true);
    expect(next.agent.name).toBe("Haath");
  });

  it("defaultHaathConfig matches schema", () => {
    const d = defaultHaathConfig();
    expect(d).toMatchObject({
      version: 1,
      agent: expect.objectContaining({ name: "Haath" }),
    });
  });
});
