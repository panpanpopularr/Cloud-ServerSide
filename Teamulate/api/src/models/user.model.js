// api/src/models/user.model.js
import prisma from '../lib/prisma.js';
import bcrypt from 'bcryptjs';

export const UserModel = {
  // ===== basic finders =====
  findById: (id) =>
    prisma.user.findUnique({ where: { id } }),

  findByEmail: (email) =>
    prisma.user.findUnique({ where: { email } }),

  // ===== local auth =====
  createLocal: async ({ name, email, password, role = 'user' }) => {
    const hashed = await bcrypt.hash(String(password), 10);
    const u = await prisma.user.create({
      data: {
        name: name ?? null,
        email: email.toLowerCase(),
        password: hashed,
        role: (role || 'user').toLowerCase(),
      },
    });
    return u;
  },

  verifyLocal: async (email, password) => {
    const u = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
    if (!u || !u.password) return null;
    const ok = await bcrypt.compare(String(password), u.password);
    return ok ? u : null;
  },

  // ===== Google OAuth (สำคัญตัวนี้) =====
  upsertFromGoogle: async ({ email, name, avatar }) => {
    // บางโปรไฟล์อาจไม่มี name/ภาพ
    const normEmail = email.toLowerCase();
    const u = await prisma.user.upsert({
      where: { email: normEmail },
      update: {
        // อัปเดตเฉพาะ field ที่ส่งมาและไม่เป็น null
        ...(name ? { name } : {}),
        ...(avatar ? { avatar } : {}),
      },
      create: {
        email: normEmail,
        name: name || null,
        avatar: avatar || null,
        role: 'user',
        // ไม่ตั้ง password (ล็อกอินด้วย Google)
      },
    });
    return u;
  },
};
