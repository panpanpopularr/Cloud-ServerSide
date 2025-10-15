// api/src/models/project.model.js
import prisma from '../lib/prisma.js';

export const ProjectModel = {
  /**
   * สร้างโปรเจ็กต์พร้อม ownerId ของผู้ที่ล็อกอิน
   */
  create: async ({ name, description = '', ownerId }) => {
    return prisma.project.create({
      data: {
        name,
        description,
        ownerId,
      },
      include: { owner: true },
    });
  },

  /**
   * คืนรายการโปรเจ็กต์ที่ผู้ใช้มองเห็น
   * - เป็นเจ้าของ (ownerId === userId)
   * - หรือถูกเชิญผ่าน ProjectMember
   */
  listForUser: async (userId) => {
    return prisma.project.findMany({
      where: {
        OR: [
          { ownerId: userId },
          { members: { some: { userId } } },
        ],
      },
      orderBy: { createdAt: 'desc' },
    });
  },

  /**
   * ตรวจสิทธิ์: เป็น owner หรือเป็น admin
   */
  isOwnerOrAdmin: async (projectId, user) => {
    if (user?.role === 'admin') return true;
    const p = await prisma.project.findUnique({
      where: { id: projectId },
      select: { ownerId: true },
    });
    return p?.ownerId === user?.id;
  },

  /**
   * ลบโปรเจ็กต์ (cascade ตาม schema)
   */
  deleteCascade: async (projectId) => {
    return prisma.project.delete({ where: { id: projectId } });
  },

  /**
   * เชิญสมาชิกเข้าโปรเจ็กต์
   */
  inviteMember: async (projectId, userId, role = 'viewer') => {
    return prisma.projectMember.upsert({
      where: { projectId_userId: { projectId, userId } },
      update: { role },
      create: { projectId, userId, role },
    });
  },
};
