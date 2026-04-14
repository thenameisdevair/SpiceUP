import { NextResponse } from "next/server";
import { ENV } from "@/lib/env";
import { getAvnuApiKey, getAvnuPaymasterBaseUrl } from "@/lib/server-avnu";

export async function POST(request: Request) {
  const apiKey = getAvnuApiKey();

  if (!apiKey) {
    return NextResponse.json(
      { error: "AVNU paymaster is not configured on the server." },
      { status: 503 }
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Paymaster proxy requires a valid JSON body." },
      { status: 400 }
    );
  }

  try {
    const upstream = await fetch(getAvnuPaymasterBaseUrl(ENV.NETWORK), {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-paymaster-api-key": apiKey,
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });

    const responseText = await upstream.text();

    return new NextResponse(responseText, {
      status: upstream.status,
      headers: {
        "content-type":
          upstream.headers.get("content-type") ?? "application/json",
        "cache-control": "no-store",
      },
    });
  } catch (error) {
    console.error("AVNU paymaster proxy failed:", error);
    return NextResponse.json(
      { error: "Failed to reach AVNU paymaster." },
      { status: 502 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    configured: Boolean(getAvnuApiKey()),
    endpoint: getAvnuPaymasterBaseUrl(ENV.NETWORK),
    network: ENV.NETWORK,
  });
}
