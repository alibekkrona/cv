import "server-only";

import { randomUUID } from "crypto";
import { cookies } from "next/headers";

export const visitorCookieName = "animal_shelter_visitor";
const visitorMaxAgeSeconds = 60 * 60 * 24 * 365;

export async function getVisitorKey() {
  const cookieStore = await cookies();
  return cookieStore.get(visitorCookieName)?.value ?? null;
}

export async function getOrCreateVisitorKey() {
  const cookieStore = await cookies();
  const existingKey = cookieStore.get(visitorCookieName)?.value;

  if (existingKey) {
    return existingKey;
  }

  const visitorKey = randomUUID();

  cookieStore.set(visitorCookieName, visitorKey, {
    httpOnly: true,
    maxAge: visitorMaxAgeSeconds,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production"
  });

  return visitorKey;
}
