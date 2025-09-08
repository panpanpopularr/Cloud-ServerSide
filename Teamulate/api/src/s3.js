
// src/s3.js
// In production, replace with AWS SDK S3 presign. For local MVP we return a dummy path.
export function getPresignedUploadKey(projectId, filename) {
  // For demo, we just return a local path under /uploads
  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  return `uploads/${projectId}/${Date.now()}_${safe}`;
}
