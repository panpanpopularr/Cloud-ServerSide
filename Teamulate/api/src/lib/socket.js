import { Server } from 'socket.io';

let io;
export const initSocket = (server) => {
  io = new Server(server, { cors: { origin: 'http://localhost:3000' } });
  io.on('connection', (socket) => {
    socket.on('join', ({ projectId }) => projectId && socket.join(projectId));
  });
};

export const emitActivity = (projectId, event) => {
  if (io) io.to(projectId).emit('activity:new', event ?? {});
};
