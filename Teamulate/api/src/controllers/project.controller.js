// api/src/controllers/project.controller.js
import { ProjectModel } from '../models/project.model.js';
import { emitActivity } from '../lib/socket.js';

function getUserId(req) {
  return req.user?.id || req.user?.uid || null;
}

export async function list(req, res, next) {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'unauthorized' });
    const projects = await ProjectModel.listForUser(userId);
    // ห่อเป็น {items} ให้สอดคล้องฝั่งเว็บ (ถ้าเว็บคุณคาดหวังแบบนี้)
    res.json({ items: projects });
  } catch (err) {
    console.error('[GET /projects]', err);
    next(err);
  }
}

export async function getOne(req, res, next) {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'unauthorized' });
    const { id } = req.params;
    const proj = await ProjectModel.getById(id);
    if (!proj) return res.status(404).json({ error: 'not_found' });
    res.json(proj);
  } catch (err) {
    console.error('[GET /projects/:id]', err);
    next(err);
  }
}

export async function members(req, res, next) {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'unauthorized' });
    const { id } = req.params;
    const items = await ProjectModel.listMembers(id);
    res.json({ items });
  } catch (err) {
    console.error('[GET /projects/:id/members]', err);
    next(err);
  }
}

export async function create(req, res, next) {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'unauthorized' });

    const { name, description = '' } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'name required' });

    const project = await ProjectModel.create({
      name: name.trim(),
      description,
      ownerId: userId,
    });

    emitActivity(project.id, 'PROJECT_CREATED', { id: project.id, name: project.name });
    // ส่ง object เดียวได้เลย (เว็บคุณรองรับทั้ง {items} และ object)
    res.status(201).json(project);
  } catch (err) {
    console.error('[POST /projects]', err);
    next(err);
  }
}

export async function remove(req, res, next) {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'unauthorized' });

    const { id } = req.params;
    const ok = await ProjectModel.isOwnerOrAdmin(id, req.user);
    if (!ok) return res.status(403).json({ error: 'forbidden' });

    await ProjectModel.deleteCascade(id);
    emitActivity(id, 'PROJECT_DELETED', { id });
    res.json({ ok: true });
  } catch (err) {
    console.error('[DELETE /projects/:id]', err);
    next(err);
  }
}
