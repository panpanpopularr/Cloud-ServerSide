// api/src/controllers/project.controller.js
import { ProjectModel } from '../models/project.model.js';
import { emitActivity } from '../lib/socket.js';

/**
 * Helper ดึง user id จาก JWT
 */
function getUserId(req) {
  return req.user?.id || req.user?.uid || null;
}

/**
 * GET /projects
 * คืนโปรเจกต์ทั้งหมดที่ user มองเห็น
 */
export async function list(req, res, next) {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'unauthorized' });

    const projects = await ProjectModel.listForUser(userId);
    res.json(projects);
  } catch (err) {
    console.error('[GET /projects]', err);
    next(err);
  }
}

/**
 * POST /projects
 * body: { name, description? }
 */
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
    res.status(201).json(project);
  } catch (err) {
    console.error('[POST /projects]', err);
    next(err);
  }
}

/**
 * DELETE /projects/:id
 */
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
