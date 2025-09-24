import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// โฟลเดอร์เก็บไฟล์จริง
export const uploadRoot = path.resolve(process.cwd(), 'uploads');

// สร้าง storage แบบแยกไดเรกทอรีต่อ projectId
const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const projectId = req.params.projectId;
    if (!projectId) return cb(new Error('projectId is required in params'));
    const dir = path.join(uploadRoot, projectId);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    // กันชื่อชน ซ้ำเติม timestamp
    const safe = file.originalname.replace(/[^\w.\-ก-๙ ]+/g, '_');
    const stamp = Date.now();
    const filename = `${stamp}-${safe}`;
    cb(null, filename);
  }
});

export const upload = multer({ storage });
