import { z } from "zod";

export const userCredentialsSchema = z.object({
  email: z.string().trim().email("Укажите корректный email."),
  password: z.string().min(8, "Пароль должен быть не короче 8 символов.")
});
