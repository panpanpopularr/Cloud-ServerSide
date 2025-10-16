// api/src/controllers/activity.controller.js
import prisma from '../lib/prisma.js';

export const ActivityController = {
  async listByProject(req, res) {
    const { projectId } = req.params;

    // ดึง activity ทั้งหมดของโปรเจกต์
    const items = await prisma.activity.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      select: { id: true, type: true, payload: true, createdAt: true },
    });

    // รวม userIds ที่อ้างใน payload
    const byIds = [...new Set(items.map(i => i?.payload?.byId).filter(Boolean))];

    // ดึงชื่อ/อีเมล "ล่าสุด" ของทุกคน
    const users = byIds.length
      ? await prisma.user.findMany({
          where: { id: { in: byIds } },
          select: { id: true, name: true, email: true },
        })
      : [];

    const mapById = Object.fromEntries(users.map(u => [u.id, u]));

    // ผสมชื่อ/อีเมลล่าสุดกลับเข้าไปใน payload ก่อนส่ง
    const enriched = items.map(i => {
      const byId = i?.payload?.byId;
      const u = byId ? mapById[byId] : null;

      return {
        id: i.id,
        type: i.type,
        createdAt: i.createdAt,
        payload: {
          ...i.payload,
          // ใช้ชื่อปัจจุบันจาก DB ก่อน, ถ้าไม่มีค่อย fallback ไปของเดิม
          byName: u?.name ?? i?.payload?.byName ?? u?.email ?? i?.payload?.byEmail ?? 'system',
          byEmail: u?.email ?? i?.payload?.byEmail ?? null,
        },
      };
    });

    res.json({ items: enriched });
  },
};
