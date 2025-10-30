// api/src/lib/aws.js
import 'dotenv/config';
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createPresignedPost } from '@aws-sdk/s3-presigned-post';   // ⬅️ ใหม่
import fs from 'fs';
import path from 'path';

const REGION = process.env.AWS_REGION || 'us-east-1';
const BUCKET = process.env.S3_BUCKET;

export const s3Client = new S3Client({
  region: REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    sessionToken: process.env.AWS_SESSION_TOKEN,
  },
});

export const s3PublicUrl = (key) =>
  `https://${BUCKET}.s3.${REGION}.amazonaws.com/${encodeURIComponent(key)}`;

export async function uploadToS3(file, key, mime='application/octet-stream') {
  await s3Client.send(new PutObjectCommand({
    Bucket: BUCKET, Key: key, Body: typeof file === 'string' ? fs.createReadStream(file) : file, ContentType: mime
  }));
  return s3PublicUrl(key);
}

export async function deleteFromS3(key) {
  await s3Client.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
}

export async function createPresignedGet(key, downloadName='file', expiresInSec=3600) {
  const cmd = new GetObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ResponseContentDisposition: `attachment; filename*=UTF-8''${encodeURIComponent(downloadName)}`
  });
  return await getSignedUrl(s3Client, cmd, { expiresIn: expiresInSec });
}

// ✅ ใหม่: Presigned POST สำหรับ Browser Upload
export async function createPresignedPostUrl({ key, contentType, maxSize = 1024 * 1024 * 100, expires = 3600 }) {
  return await createPresignedPost(s3Client, {
    Bucket: BUCKET,
    Key: key,
    Expires: expires,
    Conditions: [
      ["content-length-range", 1, maxSize]
    ],
    Fields: {
      "Content-Type": contentType || "application/octet-stream"
    }
  });
}

console.log(`✅ S3 ready: bucket=${BUCKET} region=${REGION}`);
