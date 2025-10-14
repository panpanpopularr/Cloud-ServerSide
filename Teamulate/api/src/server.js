import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';

import projectRoutes from './routes/project.routes.js';
import taskRoutes from './routes/task.routes.js';
import fileRoutes from './routes/file.routes.js';
import activityRoutes from './routes/activity.routes.js';
import { initSocket } from './lib/socket.js';

// ===== Setup basic path =====
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());
app.use(cors({ origin: 'http://localhost:3000', credentials: true }));
app.use(morgan('dev'));

// ===== Static uploads folder =====
app.use('/uploads', express.static(path.resolve('uploads')));

// ===== Mount routes =====
app.use(projectRoutes);
app.use(taskRoutes);
app.use(fileRoutes);
app.use(activityRoutes);

// ===== Not found handler =====
app.use((req, res) => {
  res.status(404).send(`Cannot ${req.method} ${req.url}`);
});

// ===== Server start =====
const server = http.createServer(app);
initSocket(server, { corsOrigin: 'http://localhost:3000' });

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`🚀 API running on http://localhost:${PORT}`);
});
