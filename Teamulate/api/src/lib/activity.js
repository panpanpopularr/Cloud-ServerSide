import prisma from './prisma.js';

export async function logActivity(projectId, type, payload = {}, user = null) {
  const byId = user?.uid || user?.id || null;
  const byName = user?.name || user?.email || null;
  return prisma.activity.create({
    data: {
      projectId,
      type,
      payload: { ...payload, ...(byId ? { byId } : {}), ...(byName ? { byName } : {}) }
    }
  });
}
