import { prisma } from "@/lib/prisma";

export async function findUserByEmail(email: string) {
  return prisma.user.findUnique({
    where: { email }
  });
}

export async function findUserById(id: number) {
  return prisma.user.findUnique({
    where: { id }
  });
}
