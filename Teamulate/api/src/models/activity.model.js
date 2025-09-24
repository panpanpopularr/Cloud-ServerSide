import { prisma } from '../lib/prisma.js';

export const ActivityModel = {
  add: (data) => prisma.activity.create({ data }),
  listByProject: (projectId) =>
    prisma.activity.findMany({ where: { projectId }, orderBy: { createdAt: 'desc' } }),
};
