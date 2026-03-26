import { NextResponse } from "next/server";
import {
  readHaathConfig,
  writeHaathConfig,
  haathAgentPatchSchema,
} from "@/lib/haath-store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const config = await readHaathConfig();
    return NextResponse.json(config.agent);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to read agent config";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body: unknown = await request.json();
    const parsed = haathAgentPatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid agent patch", details: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const cur = await readHaathConfig();
    const saved = await writeHaathConfig({
      ...cur,
      agent: { ...cur.agent, ...parsed.data },
    });
    return NextResponse.json(saved.agent);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to patch agent";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
