import { NextResponse } from "next/server";
import { ENV } from "@/lib/env";

export async function GET() {
  return NextResponse.json({
    service: "spiceup-web",
    status: "ok",
    network: ENV.NETWORK,
    timestamp: new Date().toISOString(),
  });
}
