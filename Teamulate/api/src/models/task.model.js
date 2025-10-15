import prisma from '../lib/prisma.js';

const SYSTEM_USER_EMAIL = process.env.SYSTEM_USER_EMAIL || 'system@teamulate.local';
const SYSTEM_USER_NAME  = 'System';

export const TaskModel = {
  create: async ({ projectId, title, description, deadline, status }) => {
    // deadline ต้องเป็น Date หรือ null
    const dl = deadline ? new Date(deadline) : null;

    // TRY 1: สคีมาใหม่ (มี project + creator + status)
    try {
      return await prisma.task.create({
        data: {
          title,
          description: description ?? null,
          deadline: dl,
          status, // ถ้า enum ตรงจะผ่าน
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
      console.warn('[TaskModel.create][try1 failed]', e1?.message);
    }

    // TRY 2: ไม่มี creator (บาง DB ยังไม่มีคอลัมน์นี้)
    try {
      return await prisma.task.create({
        data: {
          title,
          description: description ?? null,
          deadline: dl,
          status,
          project: { connect: { id: projectId } },
        },
      });
    } catch (e2) {
      console.warn('[TaskModel.create][try2 failed]', e2?.message);
    }

    // 👉 TRY 3: ตัด status ออก (กัน enum ไม่ตรง/แตกต่างจาก DB)
    try {
      return await prisma.task.create({
        data: {
          title,
          description: description ?? null,
          deadline: dl,
          project: { connect: { id: projectId } },
        },
      });
    } catch (e3) {
      console.warn('[TaskModel.create][try3 failed]', e3?.message);
    }

    // TRY 4: legacy (ใช้ projectId ตรง ๆ)
    return await prisma.task.create({
      data: {
        projectId,
        title,
        description: description ?? null,
        deadline: dl,
        // ไม่ส่ง status ให้ DB ใส่ default
      },
    });
  },

  findById: (id) =>
    prisma.task
      .findUnique({ where: { id } })
      .catch(() => null),

  listByProject: async (projectId, { status, q } = {}) => {
    const where = { projectId };
    if (status) where.status = status;
    if (q?.trim()) {
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
      ];
    }
    try {
      return await prisma.task.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      });
    } catch {
      // legacy
      return await prisma.task.findMany({
        where: { projectId },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      });
    }
  },

  update: (id, data) =>
    prisma.task.update({ where: { id }, data }),

  updateStatus: (id, status) =>
    prisma.task.update({ where: { id }, data: { status } }),

  setAssignees: async (taskId, userIds = []) => {
    try {
      await prisma.taskAssignee.deleteMany({ where: { taskId } });
      if (userIds.length) {
        await prisma.taskAssignee.createMany({
          data: userIds.map((uid) => ({ taskId, userId: uid })),
          skipDuplicates: true,
        });
      }
      return await prisma.task.findUnique({
        where: { id: taskId },
        include: {
          assignees: { include: { user: { select: { id: true, name: true, email: true } } } },
        },
      });
    } catch {
      // fallback: คอลัมน์ array/json ชื่อ assignees
      try {
        return await prisma.task.update({
          where: { id: taskId },
          data: { assignees: userIds },
        });
      } catch {
        return await prisma.task.findUnique({ where: { id: taskId } });
      }
    }
  },

  deleteById: (id) => prisma.task.delete({ where: { id } }),
};
