// api/src/routes/file.routes.js
import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import mime from 'mime-types';
import { ensureAuth } from '../middlewares/auth.js';
import { actorOf } from '../lib/actor.js';
import { FileModel } from '../models/file.model.js';
import prisma from '../lib/prisma.js';
import {
  STORAGE_DRIVER,
  saveLocalTempToProjectDir,
  saveTempToS3,
  s3PublicUrl,
  safeName,
  deleteFromS3,
  normalizeUploadName,   // ✅ นำเข้าใหม่
} from '../lib/storage.js';

import { createPresignedPostUrl } from '../lib/aws.js';

const router = Router();
const upload = multer({ dest: path.resolve('uploads/tmp') });
const API_URL = (process.env.API_URL || '').replace(/\/+$/, '');

// ---------- helper ----------
const toFileJSON = (rec) => {
  const projectId = rec.projectId;
  const filename = rec.filename ?? rec.s3Key ?? '';
  const base = {
    id: rec.id,
    projectId,
    filename,
    originalname: rec.originalname ?? rec.name ?? 'file',
    mimetype: rec.mimetype ?? rec.mimeType ?? 'application/octet-stream',
    size: rec.size ?? 0,
    uploadedAt: rec.uploadedAt ?? rec.createdAt ?? null,
  };
  const url =
    rec.url
    || (STORAGE_DRIVER === 's3' && filename ? s3PublicUrl(filename) : null)
    || (filename ? `${API_URL}/uploads/${projectId}/${encodeURIComponent(filename)}` : null);

  return { ...base, url };
};

// ========== LIST ==========
router.get('/projects/:projectId/files', ensureAuth, async (req, res) => {
  try {
    const items = await FileModel.listSmart(req.params.projectId);
    res.json(items.map(toFileJSON));
  } catch (e) {
    console.error('[files.list]', e);
    res.status(500).json({ error: 'list files failed' });
  }
});

// ========== UPLOAD ==========
router.post('/projects/:projectId/files/presign', ensureAuth, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { filename, contentType } = req.body || {};
    if (!filename) return res.status(400).json({ error: 'filename_required' });

    const key = `${projectId}/${safeName(filename)}`;
    const post = await createPresignedPostUrl({ key, contentType: contentType || 'application/octet-stream' });

    return res.json({
      url: post.url,
      fields: post.fields,
      key,
      // urlPreview: s3PublicUrl(key), // ถ้าอยากให้ FE แสดงลิงก์พรีวิวหลังอัปเสร็จ
    });
  } catch (e) {
    console.error('[files.presign]', e);
    res.status(500).json({ error: 'presign_failed' });
  }
});

// ✨ NEW: FE เรียก commit เพื่อบันทึกเรคอร์ดหลังอัป S3 เสร็จ
router.post('/projects/:projectId/files/commit', ensureAuth, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { key, filename, size, mimetype } = req.body || {};
    if (!key || !filename) return res.status(400).json({ error: 'key_and_filename_required' });

    const rec = await FileModel.create({
      projectId,
      filename: key,                // เก็บ key S3 (<projectId>/<safeName>)
      originalname: filename,       // เก็บชื่อเดิม (ไทยได้)
      mimetype: mimetype || 'application/octet-stream',
      size: Number(size) || 0,
      uploadedBy: actorOf(req)?.id || req.user?.id || 'system',
      url: null, // คำนวณ URL ตอนส่งออก (toFileJSON) หรือจะใส่ s3PublicUrl(key) ตรงนี้ก็ได้
    });

    await prisma.activity.create({
      data: {
        projectId,
        type: 'FILE_UPLOADED',
        payload: { id: rec.id, name: rec.originalname, by: actorOf(req) },
      },
    });

    res.json(rec);
  } catch (e) {
    console.error('[files.commit]', e);
    res.status(500).json({ error: 'commit_failed' });
  }
});

// ========== DELETE ==========
router.delete('/files/:id', ensureAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const rec = await FileModel.findById(id);
    if (!rec) return res.status(404).json({ error: 'not_found' });

    // ลบ local ถ้ามี
    const localPath = path.resolve('uploads', rec.projectId, rec.filename ?? rec.s3Key ?? '');
    try {
      if (fs.existsSync(localPath)) {
        console.log('[Local] delete:', localPath);
        fs.unlinkSync(localPath);
      }
    } catch (e) {
      console.warn('[files.delete] unlink warn:', e.message);
    }

    // ลบ S3 ถ้า driver เป็น s3
    if (STORAGE_DRIVER === 's3') {
      const key = rec.filename || rec.s3Key;
      if (key) {
        try { await deleteFromS3(key); }
        catch (e) { console.warn('[files.delete] s3 delete failed:', e?.message || e); }
      }
    }

    await prisma.activity.create({
      data: {
        projectId: rec.projectId,
        type: 'FILE_DELETED',
        payload: { id: rec.id, name: rec.originalname ?? rec.name, by: actorOf(req) },
      },
    });

    await FileModel.deleteById(id);
    res.json({ ok: true });
  } catch (e) {
    console.error('[files.delete]', e);
    res.status(500).json({ error: 'delete failed' });
  }
});

// ========== DOWNLOAD (ใหม่) ==========
// เปิดไฟล์แบบมาตรฐาน: ถ้า S3 → redirect, ถ้า local → stream ไฟล์พร้อม header ชื่อไฟล์ UTF-8
router.get('/files/:id/download', ensureAuth, async (req, res) => {
  try {
    const rec = await FileModel.findById(req.params.id);
    if (!rec) return res.status(404).json({ error: 'not_found' });

    const displayName = rec.originalname || rec.name || 'file';
    const mimeType = rec.mimetype || mime.lookup(displayName) || 'application/octet-stream';

    // ถ้าเป็น S3: redirect ไป public URL
    if (STORAGE_DRIVER === 's3') {
      const key = rec.filename || rec.s3Key;
      if (!key) return res.status(404).json({ error: 'missing_key' });
      const url = rec.url || s3PublicUrl(key);
      return res.redirect(302, url);
    }

    // ถ้าเป็น local: stream ไฟล์
    const filename = rec.filename ?? rec.s3Key ?? '';
    const abs = path.resolve('uploads', String(rec.projectId), String(filename));
    if (!fs.existsSync(abs)) return res.status(404).json({ error: 'file_not_found' });

    // RFC 5987 – รองรับชื่อไฟล์ UTF-8
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(displayName)}`);
    const stream = fs.createReadStream(abs);
    stream.on('error', () => res.status(500).end());
    stream.pipe(res);
  } catch (e) {
    console.error('[files.download]', e);
    res.status(500).json({ error: 'download_failed' });
  }
});

router.get('/files/:id/download', ensureAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const rec = await FileModel.findById(id);
    if (!rec) return res.status(404).json({ error: 'not_found' });

    const projectId = rec.projectId;
    const filename = rec.filename ?? rec.s3Key ?? '';
    const original = rec.originalname ?? rec.name ?? 'file';

    // ถ้าเป็น local ให้ส่งไฟล์แนบออกไปด้วยชื่อเดิม (รองรับไทย)
    if (STORAGE_DRIVER === 'local' && filename) {
      const abs = path.resolve('uploads', String(projectId), String(filename));
      if (!fs.existsSync(abs)) return res.status(404).json({ error: 'file_not_found' });
      return res.download(abs, original);
    }

    // ถ้าเป็น S3 (หรือ key มีเครื่องหมาย '/': ลักษณะของ <projectId>/file)
    const key = filename;
    if (!key) return res.status(404).json({ error: 'file_key_missing' });

    const url = await createPresignedGet(key, original, 3600);
    // redirect ไปยัง presigned URL
    return res.redirect(302, url);
  } catch (e) {
    console.error('[files.download]', e);
    res.status(500).json({ error: 'download_failed' });
  }
});

export default router;
