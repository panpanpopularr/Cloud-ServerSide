import { Server } from 'socket.io';

let io;

export function initSocket(httpServer, opts = {}) {
  io = new Server(httpServer, {
    cors: { origin: opts.corsOrigin ?? '*' },
  });

  io.on('connection', (socket) => {
    socket.on('join', ({ projectId }) => {
      if (projectId) socket.join(String(projectId));
    });
  });

  return io;
}

export function getIO() {
  if (!io) throw new Error('socket.io not initialized');
  return io;
}

export function emitActivity(projectId, arg2, arg3) {
  if (!io) return;
  const room = String(projectId);
  let msg;
  if (typeof arg2 === 'string') {
    msg = { type: arg2, payload: arg3 ?? {} };
  } else {
    msg = arg2 ?? {};
  }
  io.to(room).emit('activity:new', msg);
}
