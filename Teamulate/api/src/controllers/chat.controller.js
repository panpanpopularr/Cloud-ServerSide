// api/src/controllers/chat.controller.js
import prisma from '../lib/prisma.js';
import { emitChat } from '../lib/socket.js';

function getUserId(req) {
  return req.user?.id || req.user?.uid || null;
}

export async function list(req, res, next) {
  try {
    const { id: projectId } = req.params;
    const items = await prisma.chatMessage.findMany({
      where: { projectId },
      orderBy: { createdAt: 'asc' },
    });
    res.json({ items });
  } catch (e) { next(e); }
}

export async function create(req, res, next) {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'unauthorized' });

    const { id: projectId } = req.params;
    const { text = '' } = req.body;
    if (!text.trim()) return res.status(400).json({ error: 'text required' });

    const msg = await prisma.chatMessage.create({
      data: { projectId, userId, text: text.trim() },
    });

    emitChat(projectId, msg);   // broadcast realtime

    res.status(201).json(msg);
  } catch (e) { next(e); }
}
