// api/src/lib/storage.js
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { uploadToS3, deleteFromS3 as awsDeleteFromS3, s3PublicUrl as awsS3PublicUrl } from './aws.js';

export const STORAGE_DRIVER = (process.env.STORAGE_DRIVER || 'local').toLowerCase();
const REGION = process.env.AWS_REGION || 'us-east-1';
const BUCKET = process.env.S3_BUCKET;

// ทำชื่อไฟล์ให้ปลอดภัย (ASCII)
export const safeName = (name = 'file') =>
  (String(name).replace(/[^\w.\- ]+/g, '').replace(/\s+/g, '_') || 'file').slice(0, 140);

// public URL ของ S3 key
export const s3PublicUrl = (key) => awsS3PublicUrl(key);

// อัปโหลดแบบ local
export async function saveLocalTempToProjectDir(tempPath, projectId, originalname) {
  const dir = path.resolve('uploads', String(projectId));
  fs.mkdirSync(dir, { recursive: true });
  const filename = safeName(originalname);
  const newPath = path.join(dir, filename);
  fs.renameSync(tempPath, newPath);
  return { driver: 'local', filename, key: filename, url: null };
}

// อัปโหลดขึ้น S3 (ผ่านฟังก์ชันที่ทดสอบแล้ว)
export async function saveTempToS3(tempPath, projectId, originalname, mime) {
  const key = `${projectId}/${safeName(originalname)}`;
  const body = fs.createReadStream(tempPath);
  const url = await uploadToS3(body, key, mime);
  try { fs.unlinkSync(tempPath); } catch {}
  return { driver: 's3', key, url };
}

// ⬇️ export ฟังก์ชันลบ S3 เพื่อนำไปใช้ที่ routes
export async function deleteFromS3(key) {
  // เพิ่ม log ให้เห็นชัดตอนลบ
  console.log(`[S3] delete object: s3://${BUCKET}/${key}`);
  return awsDeleteFromS3(key);
}

export function normalizeUploadName(name = 'file') {
  if (!name) return 'file';
  // ถ้าพบลักษณะ mojibake ทั่วไป ค่อยลองแปลง latin1 -> utf8
  const looksMojibake = /Ã|Â|à¸|à¹|àˆ|àี|àิ/.test(name);
  if (!looksMojibake) return name;
  try {
    const fixed = Buffer.from(name, 'latin1').toString('utf8');
    return fixed || name;
  } catch {
    return name;
  }
}