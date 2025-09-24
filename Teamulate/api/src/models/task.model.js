import { prisma } from '../lib/prisma.js';

const SYSTEM_USER_EMAIL =
  process.env.SYSTEM_USER_EMAIL || 'system@teamulate.local';
const SYSTEM_USER_NAME = 'System';

export const TaskModel = {
  create: async ({ projectId, title, description, deadline, status }) => {
    // 1) schema ที่ต้องการ relation project + creator
    try {
      return await prisma.task.create({
        data: {
          title,
          description: description ?? null,
          deadline: deadline ? new Date(deadline) : null,
          status,
          project: { connect: { id: projectId } },
          creator: {
            connectOrCreate: {
              where: { email: SYSTEM_USER_EMAIL }, // ต้อง unique ใน model User
              create: { email: SYSTEM_USER_EMAIL, name: SYSTEM_USER_NAME },
            },
          },
        },
      });
    } catch (e1) {
      console.warn('[TaskModel.create][try1 failed]', e1?.message);
      // 2) บางสคีมาไม่บังคับ creator → ลองตัดออก
      try {
        return await prisma.task.create({
          data: {
            title,
            description: description ?? null,
            deadline: deadline ? new Date(deadline) : null,
            status,
            project: { connect: { id: projectId } },
          },
        });
      } catch (e2) {
        console.warn('[TaskModel.create][try2 failed]', e2?.message);
        // 3) สคีมาเก่า ใช้ projectId ตรง ๆ
        return await prisma.task.create({
          data: {
            projectId,
            title,
            description: description ?? null,
            deadline: deadline ? new Date(deadline) : null,
            status,
          },
        });
      }
    }
  },

  listByProject: (projectId) =>
    prisma.task.findMany({
      where: { projectId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    }),

  updateStatus: (id, status) =>
    prisma.task.update({
      where: { id },
      data: { status },
    }),

  deleteById: (id) =>
    prisma.task.delete({
      where: { id },
    }),
};
