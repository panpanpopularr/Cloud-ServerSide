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
import taskRoutes from './routes/task.routes.js';
import fileRoutes from './routes/file.routes.js';
import activityRoutes from './routes/activity.routes.js';
import memberRoutes from './routes/member.routes.js';
import { initSocket } from './lib/socket.js';
import { ensureAdminSeed } from './lib/bootstrap.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FRONTEND = process.env.FRONTEND_URL || 'http://localhost:3000';
const PORT = process.env.PORT || 4000;
const SESSION_SECRET = process.env.SESSION_SECRET || 'dev_secret_change_me';

// ✅ อนุญาตหลาย origin ผ่าน ENV (คั่นด้วย comma) หรือ fallback เป็น FRONTEND
// ตัวอย่างตั้งค่า: CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000,http://192.168.1.10:3000
const ALLOWED_ORIGINS = (process.env.CORS_ORIGINS || FRONTEND)
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

const app = express();

// ===== CORS =====
// ใช้ dynamic origin (ต้องคืนค่า origin เดิมเพื่อให้ cookie ติดได้)
app.use(
  cors({
    origin(origin, cb) {
      // กรณี same-origin/curl ที่ไม่มี origin ให้ผ่านได้
      if (!origin) return cb(null, true);
      if (ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
      return cb(new Error(`CORS blocked: ${origin}`), false);
    },
    credentials: true,
  })
);

// preflight (กรณี lib บางตัวไม่เรียกผ่าน cors())
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', FRONTEND);
  }
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

// ===== session =====
app.use(
  session({
    name: 'connect.sid',
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: false,            // ใช้ true เมื่อรัน https
      maxAge: 1000 * 60 * 60 * 24 * 7,
    },
  })
);

// ===== passport =====
app.use(passport.initialize());
app.use(passport.session());

// ===== static =====
app.use('/uploads', express.static(path.resolve('uploads')));

// ===== routes =====
app.use(authRoutes);
app.use(adminRoutes);
app.use(projectRoutes);
app.use(taskRoutes);
app.use(fileRoutes);
app.use(activityRoutes);
app.use(memberRoutes);

// ===== 404 =====
app.use((req, res) => res.status(404).send(`Cannot ${req.method} ${req.url}`));

// ===== start server =====
const server = http.createServer(app);
initSocket(server, { corsOrigin: ALLOWED_ORIGINS[0] || FRONTEND });

server.listen(PORT, async () => {
  await ensureAdminSeed();
  console.log(`🚀 API running on http://localhost:${PORT}`);
  console.log(`CORS allowed: ${ALLOWED_ORIGINS.join(', ')}`);
});
