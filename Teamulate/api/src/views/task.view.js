export const toTaskJSON = (t) => ({
  id: t.id,
  projectId: t.projectId,
  title: t.title,
  description: t.description,
  status: t.status,
  deadline: t.deadline,
  createdAt: t.createdAt,
  updatedAt: t.updatedAt ?? null,
  // รองรับทั้ง schema relation และคอลัมน์ array/json
  assignees: Array.isArray(t.assignees)
    ? t.assignees
    : (t.assignees?.map?.(a => a.user ?? a) ?? undefined),
});
export const toTaskList = (arr) => arr.map(toTaskJSON);
