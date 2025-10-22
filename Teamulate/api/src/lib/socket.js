// api/src/lib/socket.js
import { Server } from 'socket.io';

let io = null;

// เรียกจาก server.js แล้วส่ง httpServer เข้ามา
export function initSocket(httpServer, opts = {}) {
  io = new Server(httpServer, {
    cors: {
      origin: opts.corsOrigin ?? '*',
      credentials: true,
    },
    path: '/socket.io',
  });

  // มี connection handler แค่ที่นี่ที่เดียว!
  io.on('connection', (socket) => {
    // client จะ emit('join', { projectId })
    socket.on('join', ({ projectId }) => {
      if (!projectId) return;
      const room = `project:${projectId}`;
      socket.join(room);
    });
  });

  return io;
}

export function getIO() {
  if (!io) throw new Error('socket.io not initialized');
  return io;
}

// ใช้ส่ง activity ให้ทั้งห้อง
export function emitActivity(projectId, dataOrType, payload) {
  if (!io) return;
  const room = `project:${projectId}`;
  const msg = typeof dataOrType === 'string'
    ? { type: dataOrType, payload: payload ?? {} }
    : (dataOrType ?? {});
  io.to(room).emit('activity:new', msg);
}

// ออปชัน: helper สำหรับส่งแชทแบบ broadcast
export function emitChat(projectId, message) {
  if (!io) return;
  const room = `project:${projectId}`;
  io.to(room).emit('chat:new', message);
}
