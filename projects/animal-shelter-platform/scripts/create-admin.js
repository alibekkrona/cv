const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2] || process.env.ADMIN_EMAIL;
  const password = process.argv[3] || process.env.ADMIN_PASSWORD;
  const name = process.argv[4] || process.env.ADMIN_NAME || "Admin";
  const role = normalizeRole(process.argv[5] || process.env.ADMIN_ROLE || "SUPER_ADMIN");

  if (!email || !password) {
    console.error("Usage: node scripts/create-admin.js <email> <password> [name] [SUPER_ADMIN|ADMIN|STAFF]");
    process.exitCode = 1;
    return;
  }

  if (password.length < 8) {
    console.error("Password must be at least 8 characters.");
    process.exitCode = 1;
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.upsert({
    where: { email },
    update: {
      isActive: true,
      name,
      passwordHash,
      role
    },
    create: {
      email,
      isActive: true,
      name,
      passwordHash,
      role
    }
  });

  console.log(`Admin user is ready: ${user.email} (${user.role})`);
}

function normalizeRole(value) {
  const role = String(value || "").trim().toUpperCase();
  const allowedRoles = new Set(["SUPER_ADMIN", "ADMIN", "STAFF"]);

  if (!allowedRoles.has(role)) {
    console.error("Role must be one of: SUPER_ADMIN, ADMIN, STAFF.");
    process.exit(1);
  }

  return role;
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
