import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

import projectRoutes from './routes/project.routes.js';
import { projectTaskRoutes, singleTaskRoutes } from './routes/task.routes.js';
import fileRoutes from './routes/file.routes.js';
import activityRoutes from './routes/activity.routes.js';
import { uploadRoot } from './lib/upload.js';

const app = express();

// disable etag & cache to avoid 304
app.set('etag', false);
app.use((req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });

// CORS & JSON
app.use(cors({ origin: 'http://localhost:3000', credentials: true }));
app.use(express.json());

// inject demo user id (set by server.js)
app.use((req, _res, next) => { req.demoUserId = req.app.locals.demoUserId || null; next(); });

// Health
app.get('/health', (_req, res) => res.json({ ok: true }));

// Routes
app.use('/projects', projectRoutes);
app.use('/projects', projectTaskRoutes); // /projects/:projectId/tasks
app.use('/', singleTaskRoutes);          // /tasks/:taskId
app.use('/projects', fileRoutes);
app.use('/projects', activityRoutes);

// Static uploads
app.use('/uploads', express.static(path.resolve(uploadRoot)));

export default app;
