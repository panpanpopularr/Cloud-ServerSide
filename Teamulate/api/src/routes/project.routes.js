import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { ensureAuth } from '../middlewares/auth.js';

const router = Router();

// ... routes อื่น ๆ

router.get('/projects/:projectId/activity', ensureAuth, async (req, res) => {
  try {
    const { projectId } = req.params;

    const items = await prisma.activity.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      take: 200, // จะเอากี่รายการก็ปรับได้
    });

    // รวม userIds ที่พบใน payload
    const ids = [...new Set(
      items
        .map(i => i?.payload?.byId)
        .filter(Boolean)
    )];

    // ดึงชื่อ/อีเมลปัจจุบันของทุกคน
    const users = ids.length
      ? await prisma.user.findMany({
          where: { id: { in: ids } },
          select: { id: true, name: true, email: true },
        })
      : [];

    const mapById = Object.fromEntries(users.map(u => [u.id, u]));

    // ผสมชื่อปัจจุบันกลับเข้าไปใน payload ก่อนส่ง
    const enriched = items.map(i => {
      const byId = i?.payload?.byId;
      const u = byId ? mapById[byId] : null;

      return {
        ...i,
        payload: {
          ...i.payload,
          // ใช้ชื่อปัจจุบันจาก DB ก่อน
          byName: u?.name ?? i?.payload?.byName ?? u?.email ?? i?.payload?.byEmail ?? 'system',
          byEmail: u?.email ?? i?.payload?.byEmail ?? null,
        },
      };
    });

    res.json({ items: enriched });
  } catch (e) {
    console.error('[GET activity]', e);
    res.status(500).json({ error: 'server_error' });
  }
});

export default router;
