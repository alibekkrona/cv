"use client";

import { useEffect, useRef } from "react";

type LiqPayCheckoutFormProps = {
  checkoutUrl: string;
  data: string;
  signature: string;
};

export function LiqPayCheckoutForm({ checkoutUrl, data, signature }: LiqPayCheckoutFormProps) {
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    formRef.current?.submit();
  }, []);

  return (
    <form ref={formRef} method="POST" action={checkoutUrl} className="mt-4">
      <input type="hidden" name="data" value={data} />
      <input type="hidden" name="signature" value={signature} />
      <button className="rounded-lg bg-shelter-moss px-4 py-2 text-sm font-semibold text-white">
        Перейти к LiqPay
      </button>
    </form>
  );
}
