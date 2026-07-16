export function getBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    process.env.APP_URL ||
    "http://localhost:3002"
  ).replace(/\/$/, "");
}

export function getLiqPayConfig() {
  return {
    privateKey: process.env.LIQPAY_PRIVATE_KEY || "",
    publicKey: process.env.LIQPAY_PUBLIC_KEY || "",
    sandbox: process.env.LIQPAY_SANDBOX !== "false"
  };
}

export function getMonobankConfig() {
  return {
    token: process.env.MONOBANK_TOKEN || ""
  };
}
