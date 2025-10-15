import bcrypt from 'bcryptjs';
import prisma from './prisma.js';

export async function ensureAdminSeed() {
  const email = process.env.ADMIN_EMAIL || 'admin@teamulate.local';
  const password = process.env.ADMIN_PASSWORD || 'Admin@12345';
  const name = process.env.ADMIN_NAME || 'System Admin';

  const exist = await prisma.user.findUnique({ where: { email } });
  if (exist) return;

  const hash = await bcrypt.hash(password, 10);
  await prisma.user.create({
    data: {
      email, name, password: hash, role: 'ADMIN',
    },
  });

  console.log(`✅ seeded admin: ${email} / ${password}`);
}
