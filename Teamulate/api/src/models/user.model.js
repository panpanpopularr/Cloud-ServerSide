import prisma from '../lib/prisma.js';
import bcrypt from 'bcryptjs';

export const UserModel = {
  findById: (id) => prisma.user.findUnique({ where: { id } }),
  findByEmail: (email) => prisma.user.findUnique({ where: { email } }),

  createLocal: async ({ name, email, password }) => {
    const hash = await bcrypt.hash(password, 10);
    return prisma.user.create({
      data: {
        name: name ?? null,
        email,
        password: hash,
        provider: 'local'
      }
    });
  },

  verifyLocal: async ({ email, password }) => {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.password) return null;
    const ok = await bcrypt.compare(password, user.password);
    return ok ? user : null;
  },

  upsertFromGoogle: async ({ email, name, avatar }) => {
    // ถ้ามีอยู่แล้ว อัปเดตชื่อ/ภาพ; ถ้าไม่มีก็สร้างใหม่
    return prisma.user.upsert({
      where: { email },
      create: {
        email,
        name: name ?? null,
        avatar: avatar ?? null,
        provider: 'google'
      },
      update: {
        name: name ?? undefined,
        avatar: avatar ?? undefined,
        provider: 'google'
      }
    });
  },
};
