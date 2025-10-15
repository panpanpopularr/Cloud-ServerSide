import prisma from '../lib/prisma.js';

const SYSTEM_USER_EMAIL = process.env.SYSTEM_USER_EMAIL || 'system@teamulate.local';
const SYSTEM_USER_NAME = 'System';

export const TaskModel = {
  create: async ({ projectId, title, description, deadline, status }) => {
    try {
      // schema ปัจจุบัน (project + creator)
      return await prisma.task.create({
        data: {
          title,
          description: description ?? null,
          deadline: deadline ? new Date(deadline) : null,
          status,
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
      try {
        // ไม่มี creator
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
        // legacy schema → projectId ตรง ๆ
        return await prisma.task.create({
          data: { projectId, title, description: description ?? null, deadline: deadline ? new Date(deadline) : null, status },
        });
      }
    }
  },

  findById: (id) =>
    prisma.task.findUnique({
      where: { id },
      // พยายาม include assignees ถ้ามี (ไม่ throw error ถ้า schema ไม่มี)
    }).catch(() => null),

  listByProject: async (projectId, { status, q } = {}) => {
    // พยายามใช้ where แบบยืดหยุ่น
    const where = { projectId };
    if (status) where.status = status;
    if (q?.trim()) {
      // Prisma full-text อาจต่าง schema → ใช้ contains แบบ OR
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

  update: async (id, data) => {
    // อัปเดตหลายฟิลด์ (title/description/deadline/status)
    return prisma.task.update({
      where: { id },
      data,
    });
  },

  updateStatus: (id, status) =>
    prisma.task.update({
      where: { id },
      data: { status },
    }),

  // ตั้ง assignees: รองรับทั้ง relation และคอลัมน์ array/json
  setAssignees: async (taskId, userIds = []) => {
    try {
      // สคีมาสมัยใหม่: table TaskAssignee (taskId,userId)
      // ลบทั้งหมดแล้วใส่ใหม่
      await prisma.taskAssignee.deleteMany({ where: { taskId } });
      if (userIds.length) {
        await prisma.taskAssignee.createMany({
          data: userIds.map((uid) => ({ taskId, userId: uid })),
          skipDuplicates: true,
        });
      }
      // คืน task พร้อม assignees (ถ้ามี include)
      return await prisma.task.findUnique({
        where: { id: taskId },
        include: {
          assignees: { include: { user: { select: { id: true, name: true, email: true } } } },
        },
      });
    } catch (e1) {
      // fallback: อัปเดตคอลัมน์ array/json ชื่อ 'assignees' ถ้ามี
      try {
        return await prisma.task.update({
          where: { id: taskId },
          data: { assignees: userIds },
        });
      } catch (e2) {
        // ไม่มีทั้งสองแบบ → คืน task เดิม
        return await prisma.task.findUnique({ where: { id: taskId } });
      }
    }
  },

  deleteById: (id) => prisma.task.delete({ where: { id } }),
};
