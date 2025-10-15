// api/src/views/task.view.js (หรือไฟล์ view ของคุณ)
export const toTaskJSON = (t) => ({
  id: t.id,
  projectId: t.projectId,
  title: t.title,
  status: t.status ?? null,
  deadline: t.deadline ?? null,
  createdAt: t.createdAt,
  updatedAt: t.updatedAt ?? null,
});
export const toTaskList = (arr) => arr.map(toTaskJSON);
