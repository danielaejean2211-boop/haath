import { NextResponse } from "next/server";
import {
  readHaathConfig,
  writeHaathConfig,
  haathWaterfallPatchSchema,
} from "@/lib/haath-store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const config = await readHaathConfig();
    return NextResponse.json(config.waterfall);
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Failed to read waterfall config";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body: unknown = await request.json();
    const parsed = haathWaterfallPatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid waterfall patch", details: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const cur = await readHaathConfig();
    const saved = await writeHaathConfig({
      ...cur,
      waterfall: { ...cur.waterfall, ...parsed.data },
    });
    return NextResponse.json(saved.waterfall);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to patch waterfall";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
