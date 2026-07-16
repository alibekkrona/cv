import "server-only";

import { createHmac, timingSafeEqual } from "crypto";
import type { UserRole } from "@prisma/client";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getUserById } from "@/lib/services/users.service";

const sessionCookieName = "animal_shelter_session";
const sessionMaxAgeSeconds = 60 * 60 * 24 * 7;

export type AdminSessionUser = {
  email: string;
  id: number;
  name: string | null;
  role: UserRole;
};

type SessionPayload = AdminSessionUser & {
  expiresAt: number;
};

export async function createAdminSession(user: AdminSessionUser) {
  const cookieStore = await cookies();
  const expiresAt = Date.now() + sessionMaxAgeSeconds * 1000;
  const token = signSessionPayload({ ...user, expiresAt });

  cookieStore.set(sessionCookieName, token, {
    httpOnly: true,
    maxAge: sessionMaxAgeSeconds,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production"
  });
}

export async function clearAdminSession() {
  const cookieStore = await cookies();
  cookieStore.delete(sessionCookieName);
}

export async function getAdminSessionUser(): Promise<AdminSessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(sessionCookieName)?.value;
  const payload = token ? verifySessionToken(token) : null;

  if (!payload || payload.expiresAt < Date.now()) {
    return null;
  }

  const user = await getUserById(payload.id);

  if (!user || !user.isActive) {
    return null;
  }

  return {
    email: user.email,
    id: user.id,
    name: user.name,
    role: user.role
  };
}

export async function requireAdmin() {
  const user = await getAdminSessionUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}

function signSessionPayload(payload: SessionPayload) {
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createSignature(encodedPayload);

  return `${encodedPayload}.${signature}`;
}

function verifySessionToken(token: string): SessionPayload | null {
  const [encodedPayload, signature] = token.split(".");

  if (!encodedPayload || !signature) {
    return null;
  }

  const expectedSignature = createSignature(encodedPayload);
  const signatureBuffer = Buffer.from(signature);
  const expectedSignatureBuffer = Buffer.from(expectedSignature);

  if (
    signatureBuffer.length !== expectedSignatureBuffer.length ||
    !timingSafeEqual(signatureBuffer, expectedSignatureBuffer)
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as SessionPayload;

    if (
      typeof payload.id !== "number" ||
      typeof payload.email !== "string" ||
      typeof payload.expiresAt !== "number"
    ) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

function createSignature(encodedPayload: string) {
  return createHmac("sha256", getSessionSecret())
    .update(encodedPayload)
    .digest("base64url");
}

function getSessionSecret() {
  return process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "development-secret";
}
