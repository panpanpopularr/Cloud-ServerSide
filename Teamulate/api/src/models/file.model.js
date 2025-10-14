import prisma from '../lib/prisma.js';

export const FileModel = {
  create: async (meta) => {
    try {
      // สคีมาใหม่
      return await prisma.file.create({
        data: {
          projectId: meta.projectId,
          filename: meta.filename,
          originalname: meta.originalname,
          mimetype: meta.mimetype,
          size: meta.size,
          // uploadedAt default(now())
        },
      });
    } catch (e1) {
      console.warn('[FileModel.create][fallback]', e1.message);
      // สคีมาเก่า
      return await prisma.file.create({
        data: {
          projectId: meta.projectId,
          name: meta.originalname,
          mimeType: meta.mimetype,
          size: meta.size,
          s3Key: meta.filename,
          uploadedBy: meta.uploadedBy ?? 'system',
        },
      });
    }
  },

  listSmart: async (projectId) => {
    // รองรับชื่อคอลัมน์หลายยุค
    try {
      return await prisma.file.findMany({
        where: { projectId },
        orderBy: { uploadedAt: 'desc' },
      });
    } catch {
      try {
        return await prisma.file.findMany({
          where: { projectId },
          orderBy: { createdAt: 'desc' },
        });
      } catch {
        return await prisma.file.findMany({
          where: { projectId },
          orderBy: { id: 'desc' },
        });
      }
    }
  },

  // ใช้ select ให้ได้ค่าที่ต้องใช้ลบไฟล์บนดิสก์ด้วย
  findById: (id) =>
    prisma.file.findUnique({
      where: { id },
      select: {
        id: true,
        projectId: true,
        filename: true,      // new
        s3Key: true,         // legacy
        originalname: true,  // new
        name: true,          // legacy
      },
    }),

  deleteById: (id) => prisma.file.delete({ where: { id } }),
};
