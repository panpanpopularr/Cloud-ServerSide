// api/src/models/task.model.js
import prisma from '../lib/prisma.js';

const SYSTEM_USER_EMAIL = process.env.SYSTEM_USER_EMAIL || 'system@teamulate.local';
const SYSTEM_USER_NAME  = 'System';

export const TaskModel = {
  create: async ({ projectId, title, deadline, status }) => {
    const dl = deadline ? new Date(deadline) : null;

    // 1) schema ใหม่ครบ
    try {
      return await prisma.task.create({
        data: {
          title,
          deadline: dl,
          status: status ?? undefined,
          project: { connect: { id: projectId } },
          creator: {
            connectOrCreate: {
              where: { email: SYSTEM_USER_EMAIL },
              create: { email: SYSTEM_USER_EMAIL, name: SYSTEM_USER_NAME },
            },
          },
        },
      });
    } catch (e1) {
      console.warn('[TaskModel.create][1]', e1.message);
    }

    // 2) ไม่มี creator
    try {
      return await prisma.task.create({
        data: {
          title,
          deadline: dl,
          status: status ?? undefined,
          project: { connect: { id: projectId } },
        },
      });
    } catch (e2) {
      console.warn('[TaskModel.create][2]', e2.message);
    }

    // 3) ไม่ส่ง status (ปล่อย default)
    try {
      return await prisma.task.create({
        data: {
          title,
          deadline: dl,
          project: { connect: { id: projectId } },
        },
      });
    } catch (e3) {
      console.warn('[TaskModel.create][3]', e3.message);
    }

    // 4) legacy: ใช้ projectId ตรง ๆ
    return await prisma.task.create({
      data: {
        projectId,
        title,
        deadline: dl,
      },
    });
  },

  findById: (id) => prisma.task.findUnique({ where: { id } }).catch(() => null),

  listByProject: async (projectId, { status, q } = {}) => {
    const where = { projectId };
    if (status) where.status = status;
    if (q?.trim()) {
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
      ];
    }
    try {
      return await prisma.task.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      });
    } catch {
      return await prisma.task.findMany({
        where: { projectId },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      });
    }
  },

  update: (id, data) => prisma.task.update({ where: { id }, data }),
  updateStatus: (id, status) => prisma.task.update({ where: { id }, data: { status } }),
  deleteById: (id) => prisma.task.delete({ where: { id } }),
};
