
// src/store.js
import { v4 as uuid } from 'uuid';

export const db = {
  users: [],
  projects: [],
  tasks: [],
  files: [],
  activity: [], // {id, projectId, type, payload, createdAt}
};

export function createProject({ name, description }) {
  const id = uuid();
  const project = { id, name, description: description || '', createdAt: new Date().toISOString() };
  db.projects.push(project);
  pushActivity(project.id, 'PROJECT_CREATED', { name });
  return project;
}

export function listProjects() {
  return db.projects.slice().sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
}

export function getProject(id) {
  return db.projects.find(p => p.id === id) || null;
}

export function createTask(projectId, { title, description, status, deadline, assignees }) {
  const id = uuid();
  const task = {
    id, projectId,
    title, description: description || '',
    status: status || 'ACTIVE',
    deadline: deadline || null,
    assignees: Array.isArray(assignees) ? assignees : [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  db.tasks.push(task);
  pushActivity(projectId, 'TASK_CREATED', { id, title, assignees });
  return task;
}

export function listTasks(projectId) {
  return db.tasks.filter(t => t.projectId === projectId).sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
}

export function updateTask(taskId, patch) {
  const idx = db.tasks.findIndex(t => t.id === taskId);
  if (idx < 0) return null;
  const before = db.tasks[idx];
  const after = { ...before, ...patch, updatedAt: new Date().toISOString() };
  db.tasks[idx] = after;
  if (patch.status && patch.status !== before.status) {
    pushActivity(after.projectId, 'TASK_STATUS_CHANGED', { taskId, from: before.status, to: patch.status });
  }
  return after;
}

export function addFile(projectId, fileMeta) {
  const id = uuid();
  const entry = { id, projectId, ...fileMeta, createdAt: new Date().toISOString() };
  db.files.push(entry);
  pushActivity(projectId, 'FILE_UPLOADED', { id, name: fileMeta.originalname, size: fileMeta.size });
  return entry;
}

export function listFiles(projectId) {
  return db.files.filter(f => f.projectId === projectId).sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
}

export function listActivity(projectId, cursor = 0, limit = 20) {
  const all = db.activity.filter(a => a.projectId === projectId).sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
  const start = Number(cursor) || 0;
  return { items: all.slice(start, start + limit), nextCursor: (start + limit < all.length) ? start + limit : null };
}

export function pushActivity(projectId, type, payload) {
  db.activity.push({
    id: uuid(),
    projectId,
    type,
    payload,
    createdAt: new Date().toISOString()
  });
}
