"use client";

import { useState } from "react";
import { createDonationAction } from "@/app/actions/donations.actions";

const donationAmounts = [100, 300, 500, 1000];

type DonationButtonProps = {
  animalId?: number;
  animalName?: string;
  className?: string;
  label?: string;
  needId?: number;
  needTitle?: string;
  target: "SHELTER" | "ANIMAL" | "NEED";
};

export function DonationButton({
  animalId,
  animalName,
  className = "rounded-full bg-shelter-moss px-4 py-2 text-sm font-semibold text-white",
  label = "Задонатить",
  needId,
  needTitle,
  target
}: DonationButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [amount, setAmount] = useState("300");
  const numericAmount = Number(amount || 0);
  const title = target === "NEED"
    ? `Донат на потребность: ${needTitle}`
    : target === "ANIMAL"
      ? `Донат для ${animalName}`
      : "Донат приюту";

  return (
    <>
      <button type="button" onClick={() => setIsOpen(true)} className={className}>
        {label}
      </button>
      {isOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 px-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-lg rounded-xl bg-[#212121] p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">{title}</h2>
                <p className="mt-2 text-sm leading-6 text-shelter-ink/70">
                  Оплата пройдет на защищенной стороне банка. Данные карты не вводятся и не хранятся на сайте приюта.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Закрыть"
                className="text-3xl leading-none text-shelter-ink/60 hover:text-shelter-ink"
              >
                ×
              </button>
            </div>

            <form action={createDonationAction} className="mt-5 grid gap-4">
              <input type="hidden" name="target" value={target} />
              <input type="hidden" name="amount" value={numericAmount} />
              {needId ? <input type="hidden" name="needId" value={needId} /> : null}
              {animalId ? <input type="hidden" name="animalId" value={animalId} /> : null}

              <div className="grid grid-cols-4 gap-2">
                {donationAmounts.map((preset) => {
                  const isSelected = numericAmount === preset;

                  return (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setAmount(String(preset))}
                      className={`rounded-lg border px-3 py-2 text-center text-sm font-semibold transition ${
                        isSelected
                          ? "border-shelter-moss bg-shelter-moss text-white"
                          : "border-white/15 hover:border-shelter-moss"
                      }`}
                    >
                      {preset} грн
                    </button>
                  );
                })}
              </div>

              <label className="grid gap-1 text-sm">
                Сумма, грн
                <input
                  type="number"
                  min="10"
                  step="1"
                  placeholder="Например, 750"
                  value={amount}
                  className="rounded-lg border border-white/15 bg-white/10 px-3 py-2"
                  onChange={(event) => setAmount(event.currentTarget.value)}
                />
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1 text-sm">
                  Имя
                  <input name="donorName" className="rounded-lg border border-white/15 bg-white/10 px-3 py-2" />
                </label>
                <label className="grid gap-1 text-sm">
                  Телефон
                  <input name="donorPhone" className="rounded-lg border border-white/15 bg-white/10 px-3 py-2" />
                </label>
              </div>
              <label className="grid gap-1 text-sm">
                Email
                <input name="donorEmail" type="email" className="rounded-lg border border-white/15 bg-white/10 px-3 py-2" />
              </label>
              <label className="grid gap-1 text-sm">
                Банк
                <select name="paymentProvider" defaultValue="LIQPAY" className="rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-shelter-ink [color-scheme:dark] [&_option]:bg-[#212121] [&_option]:text-white">
                  <option value="LIQPAY">PrivatBank / LiqPay</option>
                  <option value="MONOBANK">monobank</option>
                </select>
              </label>
              <label className="grid gap-1 text-sm">
                Сообщение
                <textarea name="message" className="min-h-24 rounded-lg border border-white/15 bg-white/10 px-3 py-2" />
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input name="isAnonymous" type="checkbox" value="true" />
                Анонимный донат
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input name="publicConsent" type="checkbox" value="true" defaultChecked />
                Можно показать в списке донатов
              </label>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setIsOpen(false)} className="rounded-lg border border-white/15 px-4 py-2 text-sm font-semibold">
                  Отмена
                </button>
                <button className="rounded-lg bg-shelter-moss px-4 py-2 text-sm font-semibold text-white">
                  Перейти к оплате
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
