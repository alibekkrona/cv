import { getBaseUrl, getMonobankConfig } from "@/lib/payments/config";

const invoiceCreateUrl = "https://api.monobank.ua/api/merchant/invoice/create";

type CreateMonobankInvoiceInput = {
  amountCents: number;
  description: string;
  publicId: string;
};

type MonobankInvoiceResponse = {
  invoiceId: string;
  pageUrl: string;
};

export function isMonobankConfigured() {
  return Boolean(getMonobankConfig().token);
}

export async function createMonobankInvoice(input: CreateMonobankInvoiceInput) {
  const { token } = getMonobankConfig();
  const baseUrl = getBaseUrl();
  const request = {
    amount: input.amountCents,
    ccy: 980,
    merchantPaymInfo: {
      destination: input.description,
      reference: input.publicId
    },
    redirectUrl: `${baseUrl}/donations/pay/${input.publicId}`,
    webHookUrl: `${baseUrl}/api/payments/monobank/webhook`
  };

  const response = await fetch(invoiceCreateUrl, {
    body: JSON.stringify(request),
    headers: {
      "Content-Type": "application/json",
      "X-Token": token
    },
    method: "POST"
  });
  const payload = await response.json() as MonobankInvoiceResponse & { errCode?: string; errText?: string };

  if (!response.ok) {
    throw new Error(payload.errText || payload.errCode || "Monobank invoice creation failed.");
  }

  return { payload, request };
}

export function mapMonobankStatus(status: unknown) {
  if (status === "success") {
    return "SUCCEEDED" as const;
  }

  if (["failure", "expired", "reversed"].includes(String(status))) {
    return "FAILED" as const;
  }

  if (status === "hold") {
    return "PENDING" as const;
  }

  return "PENDING" as const;
}
