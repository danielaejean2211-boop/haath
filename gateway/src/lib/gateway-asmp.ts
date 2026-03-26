import {
  ASMPWorkflow,
  createFetchHandler,
  InMemoryStore,
  type TransitionDef,
} from "@/lib/asmp-sdk";
import {
  haathConfigSchema,
  readHaathConfig,
  writeHaathConfig,
  type HaathConfig,
} from "@/lib/haath-store";
import { HAATH_ASMP_BASE_PATH } from "@/lib/constants";

const transitions: TransitionDef[] = [
  {
    from_state: "HOME",
    action: "go_agent",
    to_state: "AGENT",
    is_critical: false,
  },
  {
    from_state: "HOME",
    action: "go_waterfall",
    to_state: "WATERFALL",
    is_critical: false,
  },
  {
    from_state: "AGENT",
    action: "back",
    to_state: "HOME",
    is_critical: false,
  },
  {
    from_state: "WATERFALL",
    action: "back",
    to_state: "HOME",
    is_critical: false,
  },
];

const store = new InMemoryStore();

const workflow = new ASMPWorkflow(
  "haath-gateway-config",
  "HOME",
  transitions,
  "http://127.0.0.1:28657/asmp",
);

workflow
  .hint(
    "HOME",
    "Haath gateway configuration over ASMP. Call bootstrap to load ~/.haath/haath.json into this run, use go_agent / go_waterfall transitions for the menu, and invoke tools to read or persist config. Use clrun dynamic ASMP remote-CLI mode with this server's ASMP base URL.",
  )
  .hint(
    "AGENT",
    "Agent block (name, ASMP URL, notes). patch_agent merges JSON into agent and saves. reload_run refreshes from disk. back returns home.",
  )
  .hint(
    "WATERFALL",
    "Waterfall LLM gateway (enabled, gatewayUrl). patch_waterfall merges and saves. reload_run refreshes from disk. back returns home.",
  )
  .cli("HOME", {
    prompt: "Haath gateway",
    hint: "bootstrap first if needed, then choose a section or use tools (save_config, get_config_live, replace_config).",
    options: [
      { action: "go_agent", label: "Agent / ASMP settings" },
      { action: "go_waterfall", label: "Waterfall LLM gateway" },
    ],
  });

workflow.tool(
  "HOME",
  "bootstrap",
  async (runId, r) => {
    const cfg = await readHaathConfig();
    const next = { ...r, data: { ...r.data, config: cfg } };
    store.set(runId, next);
    return { ok: true, config: cfg };
  },
  {
    description: "Load haath.json from disk into run data (required before save_config if run is empty)",
    expects: {},
  },
);

workflow.tool(
  "HOME",
  "get_config_live",
  async () => {
    const cfg = await readHaathConfig();
    return { config: cfg };
  },
  {
    description: "Read ~/.haath/haath.json from disk without changing the run",
    expects: {},
  },
);

workflow.tool(
  "HOME",
  "save_config",
  async (runId, r) => {
    const raw = r.data?.config;
    if (!raw || typeof raw !== "object") {
      throw new Error("No config in run data; invoke bootstrap first");
    }
    const saved = await writeHaathConfig(
      haathConfigSchema.parse(raw) as HaathConfig,
    );
    const next = { ...r, data: { ...r.data, config: saved } };
    store.set(runId, next);
    return { ok: true, config: saved };
  },
  {
    description: "Validate run data.config and write ~/.haath/haath.json",
    expects: {},
  },
);

workflow.tool(
  "HOME",
  "replace_config",
  async (runId, r, body) => {
    const cfg = haathConfigSchema.parse(body);
    const saved = await writeHaathConfig(cfg);
    const next = { ...r, data: { ...r.data, config: saved } };
    store.set(runId, next);
    return { ok: true, config: saved };
  },
  {
    description: "Replace entire config from JSON body (validated) and save to disk",
    expects: {},
  },
);

workflow.resource(
  "HOME",
  "haath.json",
  async () => readHaathConfig(),
  { name: "haath.json", mime_type: "application/json" },
);

workflow.tool(
  "AGENT",
  "patch_agent",
  async (runId, r, body) => {
    const cfg =
      (r.data?.config as HaathConfig | undefined) ?? (await readHaathConfig());
    const merged = haathConfigSchema.parse({
      ...cfg,
      agent: { ...cfg.agent, ...body },
    });
    const saved = await writeHaathConfig(merged);
    const next = { ...r, data: { ...r.data, config: saved } };
    store.set(runId, next);
    return { ok: true, agent: saved.agent };
  },
  {
    description: "Merge JSON body into agent (name, asmpBaseUrl, notes) and save",
    expects: {},
  },
);

workflow.tool(
  "AGENT",
  "reload_run",
  async (runId) => {
    const cfg = await readHaathConfig();
    const rec = store.get(runId);
    if (!rec) throw new Error("run not found");
    const next = { ...rec, data: { ...rec.data, config: cfg } };
    store.set(runId, next);
    return { ok: true, config: cfg };
  },
  { description: "Reload run.config from disk", expects: {} },
);

workflow.tool(
  "WATERFALL",
  "patch_waterfall",
  async (runId, r, body) => {
    const cfg =
      (r.data?.config as HaathConfig | undefined) ?? (await readHaathConfig());
    const merged = haathConfigSchema.parse({
      ...cfg,
      waterfall: { ...cfg.waterfall, ...body },
    });
    const saved = await writeHaathConfig(merged);
    const next = { ...r, data: { ...r.data, config: saved } };
    store.set(runId, next);
    return { ok: true, waterfall: saved.waterfall };
  },
  {
    description: "Merge JSON body into waterfall (enabled, gatewayUrl) and save",
    expects: {},
  },
);

workflow.tool(
  "WATERFALL",
  "reload_run",
  async (runId) => {
    const cfg = await readHaathConfig();
    const rec = store.get(runId);
    if (!rec) throw new Error("run not found");
    const next = { ...rec, data: { ...rec.data, config: cfg } };
    store.set(runId, next);
    return { ok: true, config: cfg };
  },
  { description: "Reload run.config from disk", expects: {} },
);

const fetchHandler = createFetchHandler(workflow, store, {
  basePath: HAATH_ASMP_BASE_PATH,
});

export function resolveAsmpPublicBase(request: Request): string {
  const url = new URL(request.url);
  const proto =
    request.headers.get("x-forwarded-proto") ??
    (url.protocol === "https:" ? "https" : "http");
  const host =
    request.headers.get("x-forwarded-host") ??
    request.headers.get("host") ??
    url.host;
  return `${proto}://${host}${HAATH_ASMP_BASE_PATH}`;
}

export function handleAsmpRequest(request: Request): Promise<Response> {
  workflow.base_url = resolveAsmpPublicBase(request).replace(/\/$/, "");
  return fetchHandler(request);
}
