import fs from "fs/promises";
import os from "os";
import path from "path";
import { z } from "zod";

/**
 * When set (e.g. in tests), config is read/written under this directory instead of ~/.haath
 */
export function resolveHaathPaths(): { haathDir: string; haathJsonPath: string } {
  const haathDir = process.env.HAATH_DATA_DIR
    ? path.resolve(process.env.HAATH_DATA_DIR)
    : path.join(os.homedir(), ".haath");
  return {
    haathDir,
    haathJsonPath: path.join(haathDir, "haath.json"),
  };
}

/** @deprecated Prefer resolveHaathPaths() — these reflect the default home location only */
export const HAATH_DIR = path.join(os.homedir(), ".haath");
/** @deprecated Prefer resolveHaathPaths().haathJsonPath */
export const HAATH_JSON_PATH = path.join(HAATH_DIR, "haath.json");

const urlOrEmpty = z.union([z.string().url(), z.literal("")]);

export const agentSchema = z.object({
  name: z.string().min(1).default("Haath"),
  asmpBaseUrl: urlOrEmpty.default(""),
  notes: z.string().default(""),
});

export const waterfallSchema = z.object({
  enabled: z.boolean().default(false),
  gatewayUrl: urlOrEmpty.default(""),
});

export const haathAgentPatchSchema = agentSchema.partial();
export const haathWaterfallPatchSchema = waterfallSchema.partial();

export const haathConfigPatchSchema = z.object({
  version: z.number().int().min(1).optional(),
  agent: haathAgentPatchSchema.optional(),
  waterfall: haathWaterfallPatchSchema.optional(),
});

export const haathConfigSchema = z.object({
  version: z.number().int().min(1).default(1),
  agent: agentSchema.default({
    name: "Haath",
    asmpBaseUrl: "",
    notes: "",
  }),
  waterfall: waterfallSchema.default({ enabled: false, gatewayUrl: "" }),
  updatedAt: z.string().optional(),
});

export type HaathConfig = z.infer<typeof haathConfigSchema>;

export function defaultHaathConfig(): HaathConfig {
  return haathConfigSchema.parse({});
}

export async function readHaathConfig(): Promise<HaathConfig> {
  const { haathJsonPath } = resolveHaathPaths();
  try {
    const raw = await fs.readFile(haathJsonPath, "utf8");
    let json: unknown;
    try {
      json = JSON.parse(raw) as unknown;
    } catch {
      throw new Error(`Invalid JSON in ${haathJsonPath}`);
    }
    return haathConfigSchema.parse(json);
  } catch (e) {
    const err = e as NodeJS.ErrnoException;
    if (err.code === "ENOENT") {
      return defaultHaathConfig();
    }
    throw e;
  }
}

export async function writeHaathConfig(config: HaathConfig): Promise<HaathConfig> {
  const { haathDir, haathJsonPath } = resolveHaathPaths();
  const withMeta: HaathConfig = {
    ...haathConfigSchema.parse(config),
    updatedAt: new Date().toISOString(),
  };
  await fs.mkdir(haathDir, { recursive: true });
  await fs.writeFile(
    haathJsonPath,
    `${JSON.stringify(withMeta, null, 2)}\n`,
    "utf8",
  );
  return withMeta;
}

export async function patchHaathConfig(
  patch: z.infer<typeof haathConfigPatchSchema>,
): Promise<HaathConfig> {
  const parsed = haathConfigPatchSchema.parse(patch);
  const cur = await readHaathConfig();
  const next: HaathConfig = haathConfigSchema.parse({
    ...cur,
    version: parsed.version ?? cur.version,
    agent: { ...cur.agent, ...parsed.agent },
    waterfall: { ...cur.waterfall, ...parsed.waterfall },
  });
  return writeHaathConfig(next);
}
