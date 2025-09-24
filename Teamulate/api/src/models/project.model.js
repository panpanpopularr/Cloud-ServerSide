import { prisma } from '../lib/prisma.js';

export const ProjectModel = {
  create: (data) => prisma.project.create({ data }),
  list: () => prisma.project.findMany({ orderBy: { createdAt: 'desc' } }),

  // ลบแบบ manual cascade และคืนรายการไฟล์ (ไว้ unlink บนดิสก์)
  deleteCascade: async (id) => {
    return prisma.$transaction(async (tx) => {
      // ❗ ดึงทุกฟิลด์ ไม่ใช้ select ที่เจาะจง (กันชื่อคอลัมน์ต่างสคีมา)
      const files = await tx.file.findMany({
        where: { projectId: id },
      });

      await tx.activity.deleteMany({ where: { projectId: id } });
      await tx.task.deleteMany({ where: { projectId: id } });
      await tx.file.deleteMany({ where: { projectId: id } });

      const proj = await tx.project.delete({ where: { id } });
      return { proj, files };
    });
  },
};
