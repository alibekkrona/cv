"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { createAdminSession, clearAdminSession } from "@/lib/auth/session";
import { getUserByEmail } from "@/lib/services/users.service";
import { userCredentialsSchema } from "@/lib/validation/user.schema";

export type LoginActionState = {
  fieldErrors?: Record<string, string[] | undefined>;
  message: string;
};

export async function loginAction(
  _state: LoginActionState,
  formData: FormData
): Promise<LoginActionState> {
  const parsed = userCredentialsSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return {
      message: "Проверьте email и пароль.",
      fieldErrors: parsed.error.flatten().fieldErrors
    };
  }

  const user = await getUserByEmail(parsed.data.email);

  if (!user || !user.isActive) {
    return {
      message: "Неверный email или пароль."
    };
  }

  const passwordMatches = await bcrypt.compare(parsed.data.password, user.passwordHash);

  if (!passwordMatches) {
    return {
      message: "Неверный email или пароль."
    };
  }

  await createAdminSession({
    email: user.email,
    id: user.id,
    name: user.name,
    role: user.role
  });

  redirect("/admin");
}

export async function logoutAction() {
  await clearAdminSession();
  redirect("/login");
}
