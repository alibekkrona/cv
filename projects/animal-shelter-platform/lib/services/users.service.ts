import { findUserByEmail, findUserById } from "@/lib/repositories/users.repository";

export async function getUserByEmail(email: string) {
  return findUserByEmail(email);
}

export async function getUserById(id: number) {
  return findUserById(id);
}
