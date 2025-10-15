// api/src/controllers/activity.controller.js
import prisma from '../lib/prisma.js';

export const ActivityController = {
  async listByProject(req, res) {
    const { projectId } = req.params;
    const items = await prisma.activity.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      select: { id: true, type: true, payload: true, createdAt: true }
    });
    res.json({ items });
  }
};
