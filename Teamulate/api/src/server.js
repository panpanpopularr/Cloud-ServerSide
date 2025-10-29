import 'dotenv/config'; // ✅ ต้องอยู่บรรทัดแรก
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import cookieParser from 'cookie-parser';
import passport from 'passport';

import './lib/passport.js';
import authRoutes from './routes/auth.routes.js';
import adminRoutes from './routes/admin.routes.js';
import projectRoutes from './routes/project.routes.js';
import userRoutes from './routes/user.routes.js';
import taskRoutes from './routes/task.routes.js';
import fileRoutes from './routes/file.routes.js';
import activityRoutes from './routes/activity.routes.js';
import memberRoutes from './routes/member.routes.js';
import chatRoutes from './routes/chat.routes.js';   // ← ใช้ชื่อเดียวกับไฟล์
import { initSocket } from './lib/socket.js';
import { ensureAdminSeed } from './lib/bootstrap.js';
import { attachUser } from './middlewares/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FRONTEND = process.env.FRONTEND_URL || 'http://localhost:3000';
const PORT = process.env.PORT || 4000;

// ===== CORS config =====
const ALLOWED_ORIGINS = (process.env.CORS_ORIGINS || FRONTEND)
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const isAllowedOrigin = (origin) => {
  if (!origin) return true;
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  if (/^http:\/\/(localhost|127\.0\.0\.1):3000$/.test(origin)) return true;
  if (/^https?:\/\/.*\.trycloudflare\.com$/.test(origin)) return true;
  return false;
};

const app = express();
app.set('trust proxy', 1);
app.get('/health', (_req, res) => res.json({ ok: true }));

// CORS
app.use(cors({
  origin: (origin, cb) => cb(null, isAllowedOrigin(origin)),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(morgan('dev'));
app.use(express.json());
app.use(cookieParser());
app.use(attachUser);
app.use(passport.initialize());

// static
app.use('/uploads', express.static(path.resolve('uploads')));

// routes (base)
app.use(authRoutes);
app.use(adminRoutes);
app.use(projectRoutes);
app.use(taskRoutes);
app.use(fileRoutes);
app.use(activityRoutes);
app.use(memberRoutes);
app.use(userRoutes);
app.use(chatRoutes);

// (optional) mirror under /api
app.use('/api', authRoutes);
app.use('/api', adminRoutes);
app.use('/api', projectRoutes);
app.use('/api', taskRoutes);
app.use('/api', fileRoutes);
app.use('/api', activityRoutes);
app.use('/api', memberRoutes);
app.use('/api', userRoutes);
app.use('/api', chatRoutes);

// 404
app.use((req, res) => res.status(404).send(`Cannot ${req.method} ${req.url}`));

// start
const server = http.createServer(app);
initSocket(server, { corsOrigin: (origin) => isAllowedOrigin(origin) });

server.listen(PORT, async () => {
  await ensureAdminSeed();
  console.log(`🚀 API running on http://localhost:${PORT}`);
  console.log(`CORS allowed origins: ${ALLOWED_ORIGINS.join(', ')}`);
  console.log(`Trust proxy: ON`);
});
