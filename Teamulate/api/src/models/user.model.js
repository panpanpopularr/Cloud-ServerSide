import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma.js';

const SALT = 10;

export const UserModel = {
  async findByEmail(email) {
    return prisma.user.findUnique({ where: { email } });
  },

  async createLocal({ name, email, password, role = 'USER' }) {
    const hash = await bcrypt.hash(password, SALT);
    return prisma.user.create({
      data: { name, email, password: hash, role },
      select: { id: true, name: true, email: true, role: true, avatar: true, createdAt: true },
    });
  },

  async verifyLocal(email, password) {
    const u = await prisma.user.findUnique({ where: { email } });
    if (!u || !u.password) return null;
    const ok = await bcrypt.compare(password, u.password);
    if (!ok) return null;
    return { id: u.id, name: u.name, email: u.email, role: u.role, avatar: u.avatar, createdAt: u.createdAt };
  },

  async allUsers() {
    return prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: { id: true, email: true, name: true, role: true, avatar: true, createdAt: true },
    });
  },

  async updateUser(id, { name, role }) {
    return prisma.user.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(role !== undefined ? { role } : {}),
      },
      select: { id: true, email: true, name: true, role: true, avatar: true, createdAt: true },
    });
  },
};
