// api/src/lib/socket.js
import { Server } from 'socket.io';

let io = null;

export function initSocket(httpServer, opts = {}) {
  const corsOpt = { credentials: true };

  if (typeof opts.corsOrigin === 'function') {
    corsOpt.origin = (origin, cb) => {
      try {
        cb(null, !!opts.corsOrigin(origin));
      } catch {
        cb(null, false);
      }
    };
  } else {
    // string | string[] | true | undefined (fallback '*')
    corsOpt.origin = opts.corsOrigin ?? '*';
  }

  io = new Server(httpServer, {
    cors: corsOpt,
    path: '/socket.io',
  });

  io.on('connection', (socket) => {
    socket.on('join', ({ projectId }) => {
      if (!projectId) return;
      socket.join(`project:${projectId}`);
    });
  });

  return io;
}

export function getIO() {
  if (!io) throw new Error('socket.io not initialized');
  return io;
}

export function emitActivity(projectId, dataOrType, payload) {
  if (!io) return;
  const room = `project:${projectId}`;
  const msg = typeof dataOrType === 'string'
    ? { type: dataOrType, payload: payload ?? {} }
    : (dataOrType ?? {});
  io.to(room).emit('activity:new', msg);
}

export function emitChat(projectId, message) {
  if (!io) return;
  io.to(`project:${projectId}`).emit('chat:new', message);
}
