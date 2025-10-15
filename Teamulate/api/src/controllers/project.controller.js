import { ProjectModel } from '../models/project.model.js';
import { emitActivity } from '../lib/socket.js';

/**
 * helper: normalize user id (รองรับทั้ง id/uid)
 */
function getUserId(req) {
  return req?.user?.id ?? req?.user?.uid ?? null;
}

/**
 * GET /projects
 * รายการโปรเจ็กต์ที่ user ที่ล็อกอิน “มองเห็น”
 */
export async function list(req, res, next) {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'unauthorized' });

    const projects = await ProjectModel.listForUser(userId);
    res.json(projects);
  } catch (err) {
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

    const { name, description = '' } = req.body || {};
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'name required' });
    }

    const project = await ProjectModel.create({
      name: name.trim(),
      description: description ?? '',
      ownerId: userId,
    });

    emitActivity(project.id, 'PROJECT_CREATED', { id: project.id, name: project.name });
    res.status(201).json(project);
  } catch (err) {
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

    const user = { ...(req.user || {}), id: userId }; // normalize ให้มี id แน่นอน
    const { id } = req.params;

    const allowed = await ProjectModel.isOwnerOrAdmin(id, user);
    if (!allowed) return res.status(403).json({ error: 'forbidden' });

    await ProjectModel.deleteCascade(id);
    emitActivity(id, 'PROJECT_DELETED', { id });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}
