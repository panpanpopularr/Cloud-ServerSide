import prisma from '../lib/prisma.js';

export async function list() {
  return prisma.project.findMany({ orderBy: { createdAt: 'desc' } });
}

export async function create(name, description) {
  return prisma.project.create({
    data: { name, description: description ?? '' },
  });
}

export async function remove(id) {
  await prisma.$transaction([
    prisma.file.deleteMany({ where: { projectId: id } }),
    prisma.task.deleteMany({ where: { projectId: id } }),
    prisma.activity.deleteMany({ where: { projectId: id } }),
    prisma.project.delete({ where: { id } }),
  ]);
  return true;
}

export const ProjectModel = {
  list,
  create: ({ name, description }) => create(name, description),
  remove,
};
