import express from 'express';
import cors from 'cors';
import http from 'http';
import path from 'path';
import fs from 'fs';

import { initSocket } from './lib/socket.js';
import projectRoutes from './routes/project.routes.js';
import taskRoutes from './routes/task.routes.js';
import fileRoutes from './routes/file.routes.js';
import activityRoutes from './routes/activity.routes.js';

const app = express();
const server = http.createServer(app);
initSocket(server);

app.use(cors({ origin: 'http://localhost:3000', credentials: true }));
app.use(express.json());

// serve static uploads
const uploadRoot = path.resolve('uploads');
if (!fs.existsSync(uploadRoot)) fs.mkdirSync(uploadRoot, { recursive: true });
app.use('/uploads', express.static(uploadRoot));

// mount routes
app.use(projectRoutes);
app.use(taskRoutes);
app.use(fileRoutes);
app.use(activityRoutes);

app.get('/', (_req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`API http://localhost:${PORT}`);
  console.log(`Static uploads at /uploads`);
});
