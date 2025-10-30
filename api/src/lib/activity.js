// api/src/lib/activity.js
import prisma from './prisma.js';

export async function logActivity(projectId, type, payload = {}, user) {
  const byId = user?.uid || user?.id || null;
  const byEmail = user?.email || null;

  // เก็บ byId/byEmail เสมอ (ไม่ต้องพึ่ง byName ที่อาจจะล้าสมัย)
  const dataPayload = {
    ...payload,
    byId,
    byEmail,
    // ไม่จำเป็นต้องใส่ byName แล้วก็ได้ แต่ถ้าอยากเก็บเป็น snapshot ก็เก็บได้
    // byName: user?.name || undefined,
  };

  return prisma.activity.create({
    data: { projectId, type, payload: dataPayload },
  });
}
