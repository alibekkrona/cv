import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { LiqPayCheckoutForm } from "@/components/donations/LiqPayCheckoutForm";
import { buildLiqPayCheckout, isLiqPayConfigured } from "@/lib/payments/liqpay";
import { arePublicDonationsEnabled } from "@/lib/services/donation-settings.service";
import { formatMoney } from "@/lib/services/donations.service";
import { ensurePaymentCheckout, getDonationPayment } from "@/lib/services/payments.service";

type DonationPayPageProps = {
  params: Promise<{
    publicId: string;
  }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function DonationPayPage({ params, searchParams }: DonationPayPageProps) {
  const { publicId } = await params;
  const query = await searchParams;
  const isProviderReturn = query.result === "1";
  const [payment, donationsEnabled] = await Promise.all([
    getDonationPayment(publicId),
    arePublicDonationsEnabled()
  ]);

  if (!payment) {
    notFound();
  }

  if (payment.status === "SUCCEEDED" || payment.donation.status === "PAID") {
    return <PaymentResult title="Спасибо за помощь" text="Платеж подтвержден. Донат уже зачислен в системе приюта." />;
  }

  if (payment.status === "FAILED" || payment.status === "CANCELLED") {
    return <PaymentResult title="Платеж не завершен" text="Оплата не была подтверждена банком. Можно вернуться к потребностям и попробовать еще раз." />;
  }

  if (!donationsEnabled) {
    return <PaymentResult title="Донаты временно отключены" text="Приют пока настраивает платежные реквизиты и бухгалтерские вопросы. Вернитесь к потребностям позже." />;
  }

  if (isProviderReturn) {
    return <PaymentResult title="Ожидаем подтверждение" text="Банк еще подтверждает платеж. Обновите страницу через несколько секунд или вернитесь к потребностям." />;
  }

  if (payment.provider === "MONOBANK") {
    const preparedPayment = await ensurePaymentCheckout(payment);

    if (preparedPayment.checkoutUrl) {
      redirect(preparedPayment.checkoutUrl);
    }

    return <ProviderNotConfigured providerName="monobank" amountCents={payment.amountCents} />;
  }

  if (!isLiqPayConfigured()) {
    return <ProviderNotConfigured providerName="LiqPay" amountCents={payment.amountCents} />;
  }

  const checkout = buildLiqPayCheckout({
    amountCents: payment.amountCents,
    description: buildPaymentDescription(payment),
    publicId: payment.publicId
  });

  return (
    <main className="mx-auto grid min-h-[60vh] max-w-xl place-items-center px-4 py-16">
      <section className="w-full rounded-xl bg-[#212121] p-6 text-center shadow-sm">
        <p className="text-sm text-shelter-ink/60">Сумма доната</p>
        <h1 className="mt-2 text-3xl font-semibold">{formatMoney(payment.amountCents)}</h1>
        <p className="mt-3 text-sm leading-6 text-shelter-ink/70">
          Сейчас откроется защищенная страница LiqPay. Данные карты вводятся только на стороне платежного провайдера.
        </p>
        <LiqPayCheckoutForm checkoutUrl={checkout.checkoutUrl} data={checkout.data} signature={checkout.signature} />
      </section>
    </main>
  );
}

function ProviderNotConfigured({ amountCents, providerName }: { amountCents: number; providerName: string }) {
  return (
    <main className="mx-auto grid min-h-[60vh] max-w-xl place-items-center px-4 py-16">
      <section className="w-full rounded-xl bg-[#212121] p-6 shadow-sm">
        <p className="text-sm text-shelter-ink/60">Сумма доната</p>
        <h1 className="mt-2 text-3xl font-semibold">{formatMoney(amountCents)}</h1>
        <p className="mt-3 text-sm leading-6 text-shelter-ink/70">
          Провайдер {providerName} еще не настроен. Добавьте ключи в `.env`, после этого эта страница автоматически начнет отправлять пользователя на оплату.
        </p>
        <Link href="/needs" className="mt-5 inline-flex rounded-lg border border-white/15 px-4 py-2 text-sm font-semibold">
          Вернуться к потребностям
        </Link>
      </section>
    </main>
  );
}

function PaymentResult({ text, title }: { text: string; title: string }) {
  return (
    <main className="mx-auto grid min-h-[60vh] max-w-xl place-items-center px-4 py-16">
      <section className="w-full rounded-xl bg-[#212121] p-6 text-center shadow-sm">
        <h1 className="text-2xl font-semibold">{title}</h1>
        <p className="mt-3 text-sm leading-6 text-shelter-ink/70">{text}</p>
        <Link href="/needs" className="mt-5 inline-flex rounded-lg bg-shelter-moss px-4 py-2 text-sm font-semibold text-white">
          К потребностям
        </Link>
      </section>
    </main>
  );
}

function buildPaymentDescription(payment: NonNullable<Awaited<ReturnType<typeof getDonationPayment>>>) {
  if (payment.donation.need) {
    return `Благотворительная помощь: ${payment.donation.need.title}`;
  }

  if (payment.donation.animal) {
    return `Благотворительная помощь для ${payment.donation.animal.name}`;
  }

  return "Благотворительная помощь приюту";
}
