import type { PaymentProvider, PaymentStatus, Prisma } from "@prisma/client";
import {
  applyPaymentStatus,
  findPaymentByProviderPaymentId,
  findPaymentByPublicId,
  updatePaymentCheckoutData
} from "@/lib/repositories/donations.repository";
import { createMonobankInvoice, isMonobankConfigured, mapMonobankStatus } from "@/lib/payments/monobank";

type PaymentWithDonation = NonNullable<Awaited<ReturnType<typeof findPaymentByPublicId>>>;

export async function getDonationPayment(publicId: string) {
  return findPaymentByPublicId(publicId);
}

export async function ensurePaymentCheckout(payment: PaymentWithDonation) {
  if (payment.provider === "MONOBANK") {
    return ensureMonobankCheckout(payment);
  }

  return payment;
}

export async function applyLiqPayCallback(publicId: string, providerPayload: Record<string, unknown>) {
  const payment = await findPaymentByPublicId(publicId);

  if (!payment) {
    return null;
  }

  return applyPaymentStatus(payment.id, mapProviderStatus("LIQPAY", providerPayload.status), providerPayload as Prisma.InputJsonValue);
}

export async function applyMonobankCallback(providerPayload: Record<string, unknown>) {
  const invoiceId = typeof providerPayload.invoiceId === "string" ? providerPayload.invoiceId : "";
  const reference = typeof providerPayload.reference === "string"
    ? providerPayload.reference
    : typeof providerPayload.merchantPaymInfo === "object" && providerPayload.merchantPaymInfo
      ? String((providerPayload.merchantPaymInfo as { reference?: unknown }).reference || "")
      : "";
  const payment = invoiceId
    ? await findPaymentByProviderPaymentId("MONOBANK", invoiceId)
    : reference
      ? await findPaymentByPublicId(reference)
      : null;

  if (!payment) {
    return null;
  }

  return applyPaymentStatus(payment.id, mapProviderStatus("MONOBANK", providerPayload.status), providerPayload as Prisma.InputJsonValue);
}

async function ensureMonobankCheckout(payment: PaymentWithDonation) {
  if (payment.checkoutUrl && payment.providerPaymentId) {
    return payment;
  }

  if (!isMonobankConfigured()) {
    return payment;
  }

  const description = buildPaymentDescription(payment);
  const invoice = await createMonobankInvoice({
    amountCents: payment.amountCents,
    description,
    publicId: payment.publicId
  });

  return updatePaymentCheckoutData(payment.id, {
    checkoutUrl: invoice.payload.pageUrl,
    providerPaymentId: invoice.payload.invoiceId,
    requestJson: invoice.request,
    responseJson: invoice.payload,
    status: "PENDING"
  });
}

function mapProviderStatus(provider: PaymentProvider, status: unknown): PaymentStatus {
  if (provider === "MONOBANK") {
    return mapMonobankStatus(status);
  }

  if (status === "success") {
    return "SUCCEEDED";
  }

  if (["failure", "error", "reversed", "subscribed"].includes(String(status))) {
    return "FAILED";
  }

  return "PENDING";
}

function buildPaymentDescription(payment: PaymentWithDonation) {
  if (payment.donation.need) {
    return `Благодійна допомога: ${payment.donation.need.title}`;
  }

  if (payment.donation.animal) {
    return `Благодійна допомога для ${payment.donation.animal.name}`;
  }

  return "Благодійна допомога притулку";
}
