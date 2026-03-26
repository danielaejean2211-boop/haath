import { handleAsmpRequest } from "@/lib/gateway-asmp";

export const runtime = "nodejs";

export function GET(request: Request) {
  return handleAsmpRequest(request);
}

export function POST(request: Request) {
  return handleAsmpRequest(request);
}
