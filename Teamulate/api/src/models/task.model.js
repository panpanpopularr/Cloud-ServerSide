import prisma from '../lib/prisma.js';

export const TaskModel = {
  /**
   * สร้าง task ผูกกับ project และ (ถ้ามี) creatorId = user ที่ล็อกอิน
   */
  create: async ({ projectId, title, description, deadline, status, creatorId }) => {
    if (!projectId) throw new Error('projectId required');
    if (!title) throw new Error('title required');

    // ตรวจว่า project มีจริง
    const p = await prisma.project.findUnique({ where: { id: projectId } });
    if (!p) throw new Error('project not found');

    try {
      // schema ใหม่: มี relation "creator"
      return await prisma.task.create({
        data: {
          title,
          description: description ?? null,
          deadline: deadline ? new Date(deadline) : null,
          status,
          project: { connect: { id: projectId } },
          ...(creatorId ? { creator: { connect: { id: creatorId } } } : {}),
        },
        include: { creator: true },
      });
    } catch (e1) {
      // ถ้า schema ไม่มี relation "creator" ให้ลองแบบไม่ใส่ creator
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
        // สุดท้าย: schema เก่า (ไม่มี relation project) — ใช้ projectId ตรง ๆ
        try {
          return await prisma.task.create({
            data: {
              projectId,
              title,
              description: description ?? null,
              deadline: deadline ? new Date(deadline) : null,
              status,
            },
          });
        } catch (e3) {
          // โยน error ที่อ่านง่าย
          const msg = e3?.message || e2?.message || e1?.message || 'create task failed';
          const err = new Error(msg);
          err.cause = { e1: e1?.message, e2: e2?.message, e3: e3?.message };
          throw err;
        }
      }
    }
  },

  listByProject: (projectId) =>
    prisma.task.findMany({
      where: { projectId },
      orderBy: [{ createdAt: 'desc' }],
      include: { creator: true },
    }),

  updateStatus: (id, status) =>
    prisma.task.update({
      where: { id },
      data: { status },
    }),

  deleteById: (id) => prisma.task.delete({ where: { id } }),
};
