// src/server.js
import 'dotenv/config';                   // ✅ ต้องอยู่บนสุดเสมอ
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
import chatRoutes from './routes/chat.routes.js';
import { initSocket } from './lib/socket.js';
import { ensureAdminSeed } from './lib/bootstrap.js';
import { attachUser } from './middlewares/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const app = express();
app.set('trust proxy', 1);

// health check (Elastic Beanstalk ใช้ path นี้)
app.get('/health', (_req, res) => res.status(200).json({ ok: true }));

// ===== CORS =====
const RAW_ORIGINS =
  process.env.CORS_ORIGIN ||
  process.env.CORS_ORIGINS ||
  process.env.FRONTEND_URL ||
  'http://localhost:3000';

const ALLOWED_ORIGINS = RAW_ORIGINS.split(',').map(s => s.trim()).filter(Boolean);
const isAllowedOrigin = (origin) => {
  if (!origin) return true;                      // health checks / curl
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  if (/^http:\/\/(localhost|127\.0\.0\.1):3000$/.test(origin)) return true;
  if (/^https?:\/\/.*\.trycloudflare\.com$/.test(origin)) return true;
  return false;
};

const corsConfig = {
  origin: (origin, cb) => cb(null, isAllowedOrigin(origin)),
  credentials: true,
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 204,
};

app.use(cors(corsConfig));  

// Core middlewares
app.use(morgan('dev'));
app.use(express.json({ limit: '20mb' }));
app.use(cookieParser());
app.use(attachUser);
app.use(passport.initialize());

// Static uploads (ตรง /var/app/current/uploads เวลารันบน EB)
app.use('/uploads', express.static(path.resolve('uploads')));

// Routes
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

// 404 fallback
app.use((req, res) => res.status(404).send(`Cannot ${req.method} ${req.url}`));

// ===== Start server =====
// ⚠️ EB จะส่ง PORT มาใน env; bind 0.0.0.0 ให้รับผ่าน Nginx ได้แน่ ๆ
const PORT = Number(process.env.PORT || 8080);
const HOST = '0.0.0.0';

const server = http.createServer(app);

// socket.io ควรกำหนดตัวตรวจสอบ origin ให้ใช้ฟังก์ชันเดียวกัน
initSocket(server, { corsOrigin: (origin) => isAllowedOrigin(origin) });

server.listen(PORT, HOST, async () => {
  await ensureAdminSeed();
  console.log(`🚀 API running on http://${HOST}:${PORT}`);
  console.log(`CORS allowed origins: ${ALLOWED_ORIGINS.join(', ') || '(none)'}`);
  console.log(`Trust proxy: ON`);
});
