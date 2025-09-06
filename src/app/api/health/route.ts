import { NextResponse } from "next/server";
import { env } from "@/lib/env";

export async function GET() {
  return NextResponse.json({
    ok: true,
    nodeEnv: env.NODE_ENV,
    ts: new Date().toISOString(),
  });
}
