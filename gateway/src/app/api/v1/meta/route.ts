import { NextResponse } from "next/server";
import {
  HAATH_ASMP_BASE_PATH,
  HAATH_CONFIG_PATH,
  HAATH_GATEWAY_PORT,
} from "@/lib/constants";
import { resolveHaathPaths } from "@/lib/haath-store";
import { resolveAsmpPublicBase } from "@/lib/gateway-asmp";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const asmpPublicBase = resolveAsmpPublicBase(request);
  const { haathJsonPath } = resolveHaathPaths();
  return NextResponse.json({
    gatewayPort: HAATH_GATEWAY_PORT,
    haathConfigDisplayPath: HAATH_CONFIG_PATH,
    haathConfigAbsolutePath: haathJsonPath,
    asmp: {
      basePath: HAATH_ASMP_BASE_PATH,
      publicBaseUrl: asmpPublicBase,
      clrunDocsUrl: "https://github.com/cybertheory/clrun",
    },
    api: {
      v1: {
        config: "/api/v1/config",
        configAgent: "/api/v1/config/agent",
        configWaterfall: "/api/v1/config/waterfall",
        health: "/api/v1/health",
        meta: "/api/v1/meta",
      },
      legacyHaath: "/api/haath",
    },
  });
}
