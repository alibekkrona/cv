import { createHash } from "crypto";
import { getBaseUrl, getLiqPayConfig } from "@/lib/payments/config";

const checkoutUrl = "https://www.liqpay.ua/api/3/checkout";

type LiqPayCheckoutInput = {
  amountCents: number;
  description: string;
  publicId: string;
};

export type LiqPayCheckoutPayload = {
  action: string;
  amount: number;
  currency: "UAH";
  description: string;
  order_id: string;
  public_key: string;
  result_url: string;
  sandbox?: 1;
  server_url: string;
  version: 3;
};

export function isLiqPayConfigured() {
  const config = getLiqPayConfig();
  return Boolean(config.publicKey && config.privateKey);
}

export function buildLiqPayCheckout(input: LiqPayCheckoutInput) {
  const config = getLiqPayConfig();
  const baseUrl = getBaseUrl();
  const payload: LiqPayCheckoutPayload = {
    action: "pay",
    amount: input.amountCents / 100,
    currency: "UAH",
    description: input.description,
    order_id: input.publicId,
    public_key: config.publicKey,
    result_url: `${baseUrl}/donations/pay/${input.publicId}?result=1`,
    server_url: `${baseUrl}/api/payments/liqpay/callback`,
    version: 3
  };

  if (config.sandbox) {
    payload.sandbox = 1;
  }

  const data = Buffer.from(JSON.stringify(payload)).toString("base64");

  return {
    checkoutUrl,
    data,
    payload,
    signature: signLiqPayData(data)
  };
}

export function signLiqPayData(data: string) {
  const { privateKey } = getLiqPayConfig();
  return createHash("sha1").update(privateKey + data + privateKey).digest("base64");
}

export function verifyLiqPaySignature(data: string, signature: string) {
  return signLiqPayData(data) === signature;
}

export function parseLiqPayData(data: string) {
  return JSON.parse(Buffer.from(data, "base64").toString("utf8")) as Record<string, unknown>;
}

export function mapLiqPayStatus(status: unknown) {
  if (status === "success") {
    return "SUCCEEDED" as const;
  }

  if (["failure", "error", "reversed", "subscribed"].includes(String(status))) {
    return "FAILED" as const;
  }

  return "PENDING" as const;
}
