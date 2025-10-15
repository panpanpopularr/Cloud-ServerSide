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
import { initSocket } from './lib/socket.js';
import { ensureAdminSeed } from './lib/bootstrap.js';
import memberRoutes from './routes/member.routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FRONTEND = process.env.FRONTEND_URL || 'http://localhost:3000';
const PORT = process.env.PORT || 4000;
const SESSION_SECRET = process.env.SESSION_SECRET || 'dev_secret_change_me';

const app = express();

// ===== CORS (สำคัญ) =====
const corsOptions = {
  origin: [FRONTEND, 'http://localhost:3000'],
  credentials: true,
};
app.use(cors(corsOptions));

// global preflight handler
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', FRONTEND);
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
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
      secure: false, // true เมื่อใช้ https
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
initSocket(server, { corsOrigin: FRONTEND });

server.listen(PORT, async () => {
  await ensureAdminSeed();
  console.log(`🚀 API running on http://localhost:${PORT}`);
});
