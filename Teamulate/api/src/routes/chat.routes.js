// api/src/routes/chat.routes.js
import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { ensureAuth } from '../middlewares/auth.js';

const r = Router();

// GET /projects/:id/chat  → ประวัติ 50 รายการล่าสุด (เรียงใหม่สุดก่อน)
r.get('/projects/:id/chat', ensureAuth, async (req, res) => {
  const projectId = req.params.id;
  const messages = await prisma.chatMessage.findMany({
    where: { projectId },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  // ส่งใหม่สุด → เก่า แต่ UI อยากโชว์ล่างสุด เลือกจะ reverse ที่ FE ก็ได้
  res.json({ items: messages.reverse() });
});

// POST /projects/:id/chat { text }
r.post('/projects/:id/chat', ensureAuth, async (req, res) => {
  const projectId = req.params.id;
  const userId = req.user.id;
  const text = (req.body?.text || '').trim();
  if (!text) return res.status(400).json({ error: 'text_required' });

  const msg = await prisma.chatMessage.create({
    data: { projectId, userId, text },
  });

  // แจ้ง socket ให้ทุกคนใน project นี้รู้
  const io = req.app.get('io');
  io.to(`project:${projectId}`).emit('chat:new', {
    id: msg.id,
    projectId,
    userId,
    text,
    createdAt: msg.createdAt,
  });

  res.status(201).json({ message: msg });
});

export default r;
