import prisma from '../lib/prisma.js';

export const FileModel = {
  create: async (meta) => {
    try {
      // schema ปัจจุบัน
      return await prisma.file.create({
        data: {
          projectId: meta.projectId,
          filename: meta.filename,
          originalname: meta.originalname,
          mimetype: meta.mimetype,
          size: meta.size,
        },
      });
    } catch (e1) {
      console.warn('[FileModel.create][fallback]', e1.message);
      // fallback → schema เก่า
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
    // พยายามเรียงตามคอลัมน์ที่อาจต่างกันในแต่ละ schema
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

  findById: (id) => prisma.file.findUnique({ where: { id } }),

  // ใช้ deleteMany เพื่อกัน P2025
  deleteById: (id) => prisma.file.deleteMany({ where: { id } }),
};
