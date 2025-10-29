import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();

try {
  await db.$connect();
  console.log("✅ Connected to RDS successfully!");
} catch (err) {
  console.error("❌ Cannot connect to RDS:", err.message);
} finally {
  await db.$disconnect();
}
