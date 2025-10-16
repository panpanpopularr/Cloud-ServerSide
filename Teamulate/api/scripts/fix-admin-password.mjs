import 'dotenv/config';
import bcrypt from 'bcryptjs';
import prisma from '../src/lib/prisma.js';

const email = process.env.ADMIN_EMAIL || 'admin@teamulate.local';
const newPass = process.env.ADMIN_PASSWORD || 'Admin@12345';

const run = async () => {
  const u = await prisma.user.findUnique({ where: { email } });
  if (!u) {
    console.log('No admin found, nothing to fix.');
    process.exit(0);
  }

  const hash = await bcrypt.hash(newPass, 10);
  await prisma.user.update({
    where: { email },
    data: {
      passwordHash: hash,   // ✅ เติมให้ถูกฟิลด์
      password: null,       // (ถ้ามีคอลัมน์ password)
    },
  });
  console.log(`✅ fixed admin passwordHash for ${email}`);
  process.exit(0);
};

run().catch((e) => { console.error(e); process.exit(1); });
