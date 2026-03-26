import { NextResponse } from "next/server";
import {
  haathConfigSchema,
  readHaathConfig,
  writeHaathConfig,
  patchHaathConfig,
  haathConfigPatchSchema,
} from "@/lib/haath-store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const config = await readHaathConfig();
    return NextResponse.json(config);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to read config";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body: unknown = await request.json();
    const parsed = haathConfigSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid config", details: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const saved = await writeHaathConfig(parsed.data);
    return NextResponse.json(saved);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to save config";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body: unknown = await request.json();
    const parsed = haathConfigPatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid patch", details: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const saved = await patchHaathConfig(parsed.data);
    return NextResponse.json(saved);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to patch config";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
