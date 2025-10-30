// api/src/lib/bootstrap.js
import bcrypt from 'bcryptjs';
import prisma from './prisma.js';

export async function ensureAdminSeed() {
  const email = (process.env.ADMIN_EMAIL || 'admin@teamulate.local').toLowerCase();
  const password = process.env.ADMIN_PASSWORD || 'Admin@12345';
  const name = process.env.ADMIN_NAME || 'System Admin';

  const hash = await bcrypt.hash(password, 10);

  // ใช้ upsert ครอบเคสที่มีอยู่แล้ว → อัปเดตรหัสผ่านให้
  await prisma.user.upsert({
    where: { email },
    update: {
      name,
      role: 'ADMIN',
      passwordHash: hash,     // ✅ ใช้ passwordHash ให้ตรง schema
    },
    create: {
      email,
      name,
      role: 'ADMIN',
      passwordHash: hash,     // ✅
    },
  });

  console.log(`✅ Admin ready: ${email} / ${password}`);
}
