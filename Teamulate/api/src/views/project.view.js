export const toProjectJSON = (p) => ({
  id: p.id,
  name: p.name,
  description: p.description,
  createdAt: p.createdAt,
});
export const toProjectList = (arr) => arr.map(toProjectJSON);
