import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { FileController } from '../controllers/file.controller.js';

const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    // เก็บไฟล์ไว้ใต้ uploads/<projectId>
    const dir = path.resolve('uploads', req.params.projectId);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const uploadMW = multer({ storage });

const router = Router();
router.get('/projects/:projectId/files', FileController.list);
router.post('/projects/:projectId/files/upload', uploadMW.single('file'), FileController.upload);
router.delete('/files/:id', FileController.remove);

export default router;
