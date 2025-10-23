// api/src/models/project.model.js
import prisma from '../lib/prisma.js';

export const ProjectModel = {
  create: async ({ name, description = '', ownerId }) => {
    return prisma.project.create({
      data: { name, description, ownerId },
      include: { owner: true },                // ให้มี owner object กลับไปด้วย
    });
  },

  listForUser: async (userId) => {
    return prisma.project.findMany({
      where: {
        OR: [
          { ownerId: userId },
          { members: { some: { userId } } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      include: { owner: true },                // เผื่อฝั่งเว็บใช้ Manager จาก owner
    });
  },

  // ⬇️ ใช้กับ GET /projects/:id
  getById: async (projectId) => {
    return prisma.project.findUnique({
      where: { id: projectId },
      include: {
        owner: true,
        _count: { select: { members: true, tasks: true, files: true } },
      },
    });
  },

  // ⬇️ ใช้กับ GET /projects/:id/members
  listMembers: async (projectId) => {
    return prisma.projectMember.findMany({
      where: { projectId },
      include: { user: true },
      orderBy: { user: { name: 'asc' } },
    });
  },

  isOwnerOrAdmin: async (projectId, user) => {
    if (user?.role === 'admin') return true;
    const p = await prisma.project.findUnique({
      where: { id: projectId },
      select: { ownerId: true },
    });
    return p?.ownerId === user?.id;
  },

  deleteCascade: async (projectId) => {
    return prisma.project.delete({ where: { id: projectId } });
  },

  inviteMember: async (projectId, userId, role = 'viewer') => {
    return prisma.projectMember.upsert({
      where: { projectId_userId: { projectId, userId } },
      update: { role },
      create: { projectId, userId, role },
    });
  },
};
