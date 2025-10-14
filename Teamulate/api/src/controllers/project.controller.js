import * as ProjectModel from '../models/project.model.js';
import { emitActivity } from '../lib/socket.js';

export async function list(_req, res, next) {
  try {
    const projects = await ProjectModel.list();
    res.json(projects);
  } catch (err) {
    next(err);
  }
}

export async function create(req, res, next) {
  try {
    const { name, description } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'name required' });

    const project = await ProjectModel.create(name.trim(), description ?? '');
    emitActivity(project.id, 'PROJECT_CREATED', { id: project.id, name: project.name });
    res.status(201).json(project);
  } catch (err) {
    next(err);
  }
}

export async function remove(req, res, next) {
  try {
    const { id } = req.params;
    const ok = await ProjectModel.remove(id);
    emitActivity(id, 'PROJECT_DELETED', { id });
    res.json({ ok });
  } catch (err) {
    next(err);
  }
}
