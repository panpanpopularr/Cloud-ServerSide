
// src/index.js
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import path from 'path';
import fs from 'fs';

import { db, createProject, listProjects, getProject, createTask, listTasks, updateTask, addFile, listFiles, listActivity, pushActivity } from './store.js';
import { getPresignedUploadKey } from './s3.js';

const app = express();
app.use(cors({ origin: 'http://localhost:3000', credentials: true }));
app.use(express.json());

const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: { origin: 'http://localhost:3000' }
});

// Socket rooms per project
io.on('connection', (socket) => {
  socket.on('join', ({ projectId }) => {
    socket.join(`project:${projectId}`);
  });
});

// Broadcast helper
function emitActivity(projectId, evt) {
  io.to(`project:${projectId}`).emit('activity:new', evt);
}

// Ensure uploads dir exists
const UPLOAD_ROOT = path.join(process.cwd(), 'uploads');
fs.mkdirSync(UPLOAD_ROOT, { recursive: true });

// Multer storage to local disk
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const projectId = req.params.projectId;
    const dest = path.join(UPLOAD_ROOT, projectId);
    fs.mkdirSync(dest, { recursive: true });
    cb(null, dest);
  },
  filename: function (req, file, cb) {
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${Date.now()}_${safe}`);
  }
});
const upload = multer({ storage });

// ---- API ----

// Health
app.get('/health', (req,res)=> res.json({ ok: true }));

// Projects
app.post('/projects', (req, res) => {
  const { name, description } = req.body || {};
  if (!name) return res.status(400).json({ error: 'name is required' });
  const proj = createProject({ name, description });
  emitActivity(proj.id, { type: 'PROJECT_CREATED', payload: { name } });
  res.json(proj);
});

app.get('/projects', (req, res) => {
  res.json(listProjects());
});

app.get('/projects/:id', (req, res) => {
  const p = getProject(req.params.id);
  if (!p) return res.status(404).json({ error: 'not found' });
  res.json(p);
});

// Tasks
app.post('/projects/:projectId/tasks', (req, res) => {
  const { title, description, status, deadline, assignees } = req.body || {};
  if (!title) return res.status(400).json({ error: 'title is required' });
  const task = createTask(req.params.projectId, { title, description, status, deadline, assignees });
  emitActivity(req.params.projectId, { type: 'TASK_CREATED', payload: { id: task.id, title: task.title } });
  res.json(task);
});

app.get('/projects/:projectId/tasks', (req, res) => {
  res.json(listTasks(req.params.projectId));
});

app.patch('/tasks/:taskId', (req, res) => {
  const updated = updateTask(req.params.taskId, req.body || {});
  if (!updated) return res.status(404).json({ error: 'not found' });
  if (req.body?.status) {
    emitActivity(updated.projectId, { type: 'TASK_STATUS_CHANGED', payload: { taskId: updated.id, to: updated.status } });
  }
  res.json(updated);
});

// Files: direct upload (MVP)
app.post('/projects/:projectId/files/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'file is required' });
  const meta = addFile(req.params.projectId, req.file);
  emitActivity(req.params.projectId, { type: 'FILE_UPLOADED', payload: { id: meta.id, name: req.file.originalname, size: req.file.size } });
  res.json(meta);
});

app.get('/projects/:projectId/files', (req, res) => {
  res.json(listFiles(req.params.projectId));
});

// Activity
app.get('/projects/:projectId/activity', (req, res) => {
  const { cursor, limit } = req.query;
  res.json(listActivity(req.params.projectId, cursor, limit ? Number(limit) : 20));
});

// Static serve uploaded files for demo (DO NOT DO IN PROD)
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});
