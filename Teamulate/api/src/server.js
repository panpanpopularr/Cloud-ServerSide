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

// ✅ อ่าน allowed origins จาก ENV คั่นด้วย comma (fallback = FRONTEND)
const ALLOWED_ORIGINS = (process.env.CORS_ORIGINS || FRONTEND)
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

// ✅ โหมด cross-site (เช่น FE/API คนละโดเมนผ่าน Cloudflare)
const IS_CROSS_SITE =
  process.env.CROSS_SITE === '1' ||
  (FRONTEND.startsWith('https://') && !FRONTEND.includes('localhost'));

const app = express();

// ถ้าอยู่หลัง reverse proxy (เช่น cloudflared) ให้เชื่อ header proto เพื่อ set secure cookie ได้
app.set('trust proxy', 1);

// ===== CORS =====
app.use(
  cors({
    origin(origin, cb) {
      // no Origin -> อนุญาต (เช่น curl / same-origin)
      if (!origin) return cb(null, true);
      if (ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
      return cb(new Error(`CORS blocked: ${origin}`), false);
    },
    credentials: true,
  })
);

// Preflight เผื่อบาง client ไม่ผ่าน cors() ข้างบน
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGINS[0] || FRONTEND);
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
      sameSite: IS_CROSS_SITE ? 'none' : 'lax',
      secure: IS_CROSS_SITE, // ต้อง true ถ้า sameSite = 'none'
      maxAge: 1000 * 60 * 60 * 24 * 7,
      path: '/',
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
initSocket(server, { corsOrigin: ALLOWED_ORIGINS });

server.listen(PORT, async () => {
  await ensureAdminSeed();
  console.log(`🚀 API running on http://localhost:${PORT}`);
  console.log(`CORS allowed: ${ALLOWED_ORIGINS.join(', ')}`);
  console.log(`Cross-site mode: ${IS_CROSS_SITE ? 'ON (SameSite=None; Secure)' : 'OFF (SameSite=Lax)'}`);
});
