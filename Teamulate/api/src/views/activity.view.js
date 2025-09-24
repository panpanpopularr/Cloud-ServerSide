export const toActivityJSON = (a) => ({
  id: a.id,
  type: a.type,
  payload: a.payload,
  createdAt: a.createdAt,
});
export const toActivityList = (list) => list.map(toActivityJSON);
