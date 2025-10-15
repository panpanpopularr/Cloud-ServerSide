import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import passport from './lib/passport.js';

import authRoutes from './routes/auth.routes.js';
import projectRoutes from './routes/project.routes.js';
import taskRoutes from './routes/task.routes.js';
import fileRoutes from './routes/file.routes.js';
import activityRoutes from './routes/activity.routes.js';
import { initSocket } from './lib/socket.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FRONTEND = process.env.FRONTEND_URL || 'http://localhost:3000';
const app = express();

app.use(cookieParser());
app.use(express.json());

// CORS ให้ส่ง cookie ได้
app.use(cors({
  origin: FRONTEND,
  credentials: true,
}));

app.use(morgan('dev'));

// ===== session + passport =====
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev_secret_change_me',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
  },
}));
app.use(passport.initialize());
app.use(passport.session());

// Static uploads
app.use('/uploads', express.static(path.resolve('uploads')));

// Mount routes
app.use(authRoutes);
app.use(projectRoutes);
app.use(taskRoutes);
app.use(fileRoutes);
app.use(activityRoutes);

// 404
app.use((req, res) => {
  res.status(404).send(`Cannot ${req.method} ${req.url}`);
});

// start
const server = http.createServer(app);
initSocket(server, { corsOrigin: FRONTEND });

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`🚀 API running on http://localhost:${PORT}`);
});
