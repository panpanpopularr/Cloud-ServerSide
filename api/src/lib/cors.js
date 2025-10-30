import cors from 'cors';
export const corsMiddleware = cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    cb(null, /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin));
  },
  methods: ['GET','POST','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
  credentials: true
});
