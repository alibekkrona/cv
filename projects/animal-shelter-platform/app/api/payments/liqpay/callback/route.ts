import { NextResponse } from "next/server";
import { applyLiqPayCallback } from "@/lib/services/payments.service";
import { parseLiqPayData, verifyLiqPaySignature } from "@/lib/payments/liqpay";

export async function POST(request: Request) {
  const formData = await request.formData();
  const data = String(formData.get("data") || "");
  const signature = String(formData.get("signature") || "");

  if (!data || !signature || !verifyLiqPaySignature(data, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const payload = parseLiqPayData(data);
  const publicId = typeof payload.order_id === "string" ? payload.order_id : "";

  if (!publicId) {
    return NextResponse.json({ error: "Missing order_id" }, { status: 400 });
  }

  await applyLiqPayCallback(publicId, payload);

  return NextResponse.json({ ok: true });
}
