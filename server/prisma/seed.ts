import path from "node:path";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const seedSchema = z.object({
  DATABASE_URL: z.string().url(),
  BOOTSTRAP_ADMIN_NAME: z.string().trim().min(1).max(120),
  BOOTSTRAP_ADMIN_EMAIL: z.string().trim().email().max(254).transform((email) => email.toLowerCase()),
  BOOTSTRAP_ADMIN_PASSWORD: z.string().min(12).max(128).refine(
    (password) => Buffer.byteLength(password, "utf8") <= 72,
    "Password must not exceed 72 UTF-8 bytes",
  ),
});

const config = seedSchema.parse(process.env);
const prisma = new PrismaClient();

async function seed() {
  const passwordHash = await bcrypt.hash(config.BOOTSTRAP_ADMIN_PASSWORD, 12);
  await prisma.user.upsert({
    where: { email: config.BOOTSTRAP_ADMIN_EMAIL },
    update: {
      name: config.BOOTSTRAP_ADMIN_NAME,
      passwordHash,
      role: "SUPER_ADMIN",
      isActive: true,
    },
    create: {
      name: config.BOOTSTRAP_ADMIN_NAME,
      email: config.BOOTSTRAP_ADMIN_EMAIL,
      passwordHash,
      role: "SUPER_ADMIN",
    },
  });
  console.log(`Super Admin account is ready for ${config.BOOTSTRAP_ADMIN_EMAIL}`);
}

seed()
  .catch((error: unknown) => {
    console.error("Failed to create the bootstrap Super Admin", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
