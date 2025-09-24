export const toTaskJSON = (t) => ({
  id: t.id,
  projectId: t.projectId,
  title: t.title,
  description: t.description,
  status: t.status,
  deadline: t.deadline,
  createdAt: t.createdAt,
});
export const toTaskList = (arr) => arr.map(toTaskJSON);
