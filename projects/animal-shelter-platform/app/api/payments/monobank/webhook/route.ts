import { NextResponse } from "next/server";
import { applyMonobankCallback } from "@/lib/services/payments.service";

export async function POST(request: Request) {
  const payload = await request.json() as Record<string, unknown>;
  const payment = await applyMonobankCallback(payload);

  if (!payment) {
    return NextResponse.json({ error: "Payment not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
