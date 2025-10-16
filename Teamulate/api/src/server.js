// api/src/server.js
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import cookieParser from 'cookie-parser';
import session from 'express-session';
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
import { initSocket } from './lib/socket.js';
import { ensureAdminSeed } from './lib/bootstrap.js';
import { attachUser } from './middlewares/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FRONTEND = process.env.FRONTEND_URL || 'http://localhost:3000';
const PORT = process.env.PORT || 4000;
const SESSION_SECRET = process.env.SESSION_SECRET || 'dev_secret_change_me';

// CORS (local)
const ALLOWED_ORIGINS = (process.env.CORS_ORIGINS || FRONTEND)
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);
const IS_CROSS_SITE = false; // local

const app = express();
app.set('trust proxy', 1);

// ===== CORS =====
app.use(
  cors({
    origin(origin, cb) {
      if (!origin) return cb(null, true);
      const ok =
        ALLOWED_ORIGINS.includes(origin) ||
        /^http:\/\/(localhost|127\.0\.0\.1):3000$/.test(origin);
      cb(null, ok);
    },
    credentials: true,
  })
);
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const allow =
    (origin && (ALLOWED_ORIGINS.includes(origin) || /^http:\/\/(localhost|127\.0\.0\.1):3000$/.test(origin)))
      ? origin
      : (ALLOWED_ORIGINS[0] || FRONTEND);
  res.setHeader('Access-Control-Allow-Origin', allow);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// ===== logger / parsers =====
app.use(morgan('dev'));
app.use(express.json());
app.use(cookieParser());

// แนบ user จาก JWT cookie ให้ทุก request (อย่าใส่ซ้ำ)
app.use(attachUser);

// (ถ้าไม่ได้ใช้ session/passport ก็เอาบล็อกนี้ออกได้)
// app.use(
//   session({
//     name: 'connect.sid',
//     secret: SESSION_SECRET,
//     resave: false,
//     saveUninitialized: false,
//     cookie: { httpOnly: true, sameSite: 'lax', secure: false, maxAge: 1000*60*60*24*7, path: '/' },
//   })
// );
// app.use(passport.initialize());
// app.use(passport.session());

// ===== static =====
app.use('/uploads', express.static(path.resolve('uploads')));

// ===== health =====
app.get('/health', (_req, res) => res.json({ ok: true }));

// ===== routes =====
app.use(authRoutes);
app.use(adminRoutes);
app.use(projectRoutes);
app.use(taskRoutes);
app.use(fileRoutes);
app.use(activityRoutes);
app.use(memberRoutes);
app.use(userRoutes);

// (ออปชัน) รองรับทั้ง root และ /api
app.use('/api', authRoutes);
app.use('/api', adminRoutes);
app.use('/api', projectRoutes);
app.use('/api', taskRoutes);
app.use('/api', fileRoutes);
app.use('/api', activityRoutes);
app.use('/api', memberRoutes);
app.use('/api', userRoutes);

// ===== 404 =====
app.use((req, res) => res.status(404).send(`Cannot ${req.method} ${req.url}`));

// ===== start server =====
const server = http.createServer(app);
initSocket(server, { corsOrigin: ALLOWED_ORIGINS });

server.listen(PORT, async () => {
  await ensureAdminSeed();
  console.log(`🚀 API running on http://localhost:${PORT}`);
  console.log(`CORS allowed: ${ALLOWED_ORIGINS.join(', ')}`);
  console.log(`Cross-site mode: OFF (SameSite=Lax)`);
});
