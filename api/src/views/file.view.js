export const toFileJSON = (f) => ({
  id: f.id,
  projectId: f.projectId,
  filename: f.filename ?? f.s3Key ?? '',          // new || legacy
  originalname: f.originalname ?? f.name ?? 'file',
  mimetype: f.mimetype ?? f.mimeType ?? 'application/octet-stream',
  size: f.size ?? 0,
  uploadedAt: f.uploadedAt ?? f.createdAt ?? null,
});

export const toFileList = (arr) => arr.map(toFileJSON);
