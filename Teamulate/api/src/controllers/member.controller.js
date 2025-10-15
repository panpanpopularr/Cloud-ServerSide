import prisma from '../lib/prisma.js';
import { ProjectModel } from '../models/project.model.js';

export const MemberController = {
  list: async (req, res) => {
    try {
      const { projectId } = req.params;
      const members = await prisma.projectMember.findMany({
        where: { projectId },
        include: { user: true },
        orderBy: { createdAt: 'asc' },
      });
      res.json(
        members.map((m) => ({
          id: m.user.id,
          name: m.user.name,
          email: m.user.email,
          role: m.role,
        }))
      );
    } catch (err) {
      console.error('[Member.list]', err);
      res.status(500).json({ error: 'list members failed' });
    }
  },

  invite: async (req, res) => {
    try {
      const { projectId } = req.params;
      const { username, userId } = req.body || {};
      const me = req.user;

      const allowed = await ProjectModel.isOwnerOrAdmin(projectId, me);
      if (!allowed) return res.status(403).json({ error: 'forbidden' });

      if (!username && !userId) return res.status(400).json({ error: 'username or userId required' });

      const user = userId
        ? await prisma.user.findUnique({ where: { id: userId } })
        : await prisma.user.findUnique({ where: { name: username } });

      if (!user) return res.status(404).json({ error: 'user not found' });

      await prisma.projectMember.upsert({
        where: { projectId_userId: { projectId, userId: user.id } },
        update: {},
        create: { projectId, userId: user.id, role: 'member' },
      });

      res.json({ ok: true, invited: { id: user.id, name: user.name } });
    } catch (err) {
      console.error('[Member.invite]', err);
      res.status(500).json({ error: 'invite failed' });
    }
  },
};
