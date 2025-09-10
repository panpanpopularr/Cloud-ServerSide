import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ====== STATUS normalize ให้ตรงกับ enum ปัจจุบัน ======
const PRISMA_ENUM = new Set(['ACTIVE','UNASSIGNED','CANCELED','REVIEW','DONE']);
const STATUS_MAP = {
  ACTIVE:'ACTIVE', UNASSIGNED:'UNASSIGNED', CANCELED:'CANCELED', REVIEW:'REVIEW', DONE:'DONE',
  // เผื่อข้อมูลเก่า/สะกดอื่น
  INACTIVE:'UNASSIGNED', SUCCESS:'DONE', CANCELLED:'CANCELED',
  // เผื่อไทย
  'กำลังทำ':'ACTIVE','ยังไม่มอบหมาย':'UNASSIGNED','ยกเลิก':'CANCELED','กำลังตรวจ':'REVIEW','เสร็จแล้ว':'DONE',
};
const normalizeStatus = (s) => {
  const mapped = STATUS_MAP[s] ?? undefined;
  return mapped && PRISMA_ENUM.has(mapped) ? mapped : undefined;
};

// ====== สร้าง demo user ไว้ผูก createdById ======
let DEMO_USER_ID = null;
async function ensureDemoUser() {
  const email = 'demo@teamulate.local';
  const name = 'Demo User';
  const user = await prisma.user.upsert({
    where: { email },
    update: { name },
    create: { email, name },
  });
  DEMO_USER_ID = user.id;
  console.log('[BOOTSTRAP] DEMO_USER_ID =', DEMO_USER_ID);
}
ensureDemoUser().catch(console.error);

// ====== App / CORS / Socket ======
const app = express();
app.use(cors({
  origin: function (origin, cb) {
    if (!origin) return cb(null, true);
    const ok = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
    cb(null, ok);
  },
  methods: ['GET','POST','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
  credentials: true
}));
app.use(express.json());

const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, { cors: { origin: /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/ } });

io.on('connection', socket => {
  socket.on('join', ({ projectId }) => socket.join(`project:${projectId}`));
});
const emitActivity = (projectId, evt) => io.to(`project:${projectId}`).emit('activity:new', evt);

// ====== Upload (เก็บโลคัล) ======
const UPLOAD_ROOT = path.join(__dirname, '..', 'uploads');
fs.mkdirSync(UPLOAD_ROOT, { recursive: true });
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dest = path.join(UPLOAD_ROOT, req.params.projectId);
    fs.mkdirSync(dest, { recursive: true }); cb(null, dest);
  },
  filename: (req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${Date.now()}_${safe}`);
  }
});
const upload = multer({ storage });

// ====== Routes ======
app.get('/health', (req,res)=>res.json({ ok:true }));

// Projects
app.post('/projects', async (req,res)=>{
  const { name, description } = req.body||{};
  if (!name) return res.status(400).json({ error:'name is required' });
  const proj = await prisma.project.create({ data: { name, description: description ?? null }});
  emitActivity(proj.id, { type: 'PROJECT_CREATED', payload: { name: proj.name } });
  res.json(proj);
});
app.get('/projects', async (req,res)=>{
  const projects = await prisma.project.findMany({ orderBy:{ createdAt:'desc' }});
  res.json(projects);
});
app.get('/projects/:id', async (req,res)=>{
  const p = await prisma.project.findUnique({ where:{ id: req.params.id }});
  if (!p) return res.status(404).json({ error:'not found' });
  res.json(p);
});

// Tasks
// api/src/index.js (เฉพาะ handler นี้)
app.post('/projects/:projectId/tasks', async (req,res)=>{
  try {
    const { title, description, deadline, status } = req.body || {};
    if (!title) return res.status(400).json({ error: 'title is required' });

    const statusCode = status ?? 'UNASSIGNED';

    const task = await prisma.task.create({
      data: {
        title,
        description: description ?? null,
        deadline: deadline ? new Date(deadline) : null,
        status: statusCode,

        // ✅ ใช้ relation connect ตามที่ schema ต้องการ
        project: { connect: { id: req.params.projectId } },

        // ✅ กัน createdById เป็น null (ถ้า schema บังคับ)
        ...(DEMO_USER_ID ? { creator: { connect: { id: DEMO_USER_ID } } } : {})
      }
    });

    emitActivity(req.params.projectId, { type:'TASK_CREATED', payload:{ id: task.id, title: task.title }});
    res.json(task);
  } catch (e) {
    console.error('create task error', e);
    res.status(400).json({ error: 'create task failed' });
  }
});

app.get('/projects/:projectId/tasks', async (req,res)=>{
  const tasks = await prisma.task.findMany({
    where:{ projectId: req.params.projectId },
    orderBy:{ createdAt:'desc' }
  });
  res.json(tasks);
});

app.patch('/tasks/:taskId', async (req,res)=>{
  const { status, title, description, deadline } = req.body || {};
  const data = {};
  if (status !== undefined) {
    const s = normalizeStatus(status);
    if (!s) return res.status(400).json({ error:'invalid status' });
    data.status = s;
  }
  if (title !== undefined) data.title = title;
  if (description !== undefined) data.description = description;
  if (deadline !== undefined) data.deadline = deadline ? new Date(deadline) : null;

  try {
    const updated = await prisma.task.update({
      where:{ id: req.params.taskId },
      data
    });
    emitActivity(updated.projectId, { type:'TASK_STATUS_CHANGED', payload:{ taskId: updated.id, to: updated.status }});
    res.json(updated);
  } catch (e) {
    if (e.code === 'P2025') return res.status(404).json({ error:'task not found' });
    console.error('update task error', e);
    res.status(400).json({ error:'update failed' });
  }
});

// Files (เก็บโลคัล)
app.post('/projects/:projectId/files/upload', upload.single('file'), async (req,res)=>{
  if (!req.file) return res.status(400).json({ error:'file is required' });
  // บันทึกเป็น metadata แบบง่าย (ไม่มีตาราง File ก็ข้ามส่วนนี้ได้)
  const fileMeta = await prisma.file.create({
    data: {
      projectId: req.params.projectId,
      name: req.file.originalname,
      s3Key: `uploads/${req.params.projectId}/${req.file.filename}`, // ชั่วคราว ชื่อคีย์โลคัล
      size: req.file.size,
      mimeType: req.file.mimetype,
      uploadedBy: DEMO_USER_ID ?? 'unknown'
    }
  });
  emitActivity(req.params.projectId, { type:'FILE_UPLOADED', payload:{ id: fileMeta.id, name: fileMeta.name, size: fileMeta.size }});
  res.json({ ...fileMeta, filename: req.file.filename, originalname: req.file.originalname });
});
app.get('/projects/:projectId/files', async (req,res)=>{
  const items = await prisma.file.findMany({
    where:{ projectId: req.params.projectId },
    orderBy:{ createdAt:'desc' }
  });
  // เติม field ชื่อไฟล์เพื่อให้ลิงก์โหลดได้
  const mapped = items.map(i => {
    const filename = i.s3Key?.split('/').pop() || '';
    return { ...i, filename, originalname: i.name, projectId: i.projectId, size: i.size };
  });
  res.json(mapped);
});

// Activity
app.get('/projects/:projectId/activity', async (req,res)=>{
  const items = await prisma.activity.findMany({
    where:{ projectId: req.params.projectId },
    orderBy:{ createdAt:'desc' },
    take: 50
  });
  res.json({ items, nextCursor: null });
});

// Serve uploads
app.use('/uploads', express.static(path.join(UPLOAD_ROOT)));

const PORT = process.env.PORT || 4000;
(async () => {
  await ensureDemoUser();
  httpServer.listen(PORT, () => console.log(`API on http://localhost:${PORT}`));
})();
