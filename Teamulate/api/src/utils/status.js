export const PRISMA_ENUM = new Set(['ACTIVE','UNASSIGNED','CANCELED','REVIEW','DONE']);
const MAP = {
  ACTIVE:'ACTIVE', UNASSIGNED:'UNASSIGNED', CANCELED:'CANCELED', REVIEW:'REVIEW', DONE:'DONE',
  INACTIVE:'UNASSIGNED', SUCCESS:'DONE', CANCELLED:'CANCELED',
  'กำลังทำ':'ACTIVE','ยังไม่มอบหมาย':'UNASSIGNED','ยกเลิก':'CANCELED','กำลังตรวจ':'REVIEW','เสร็จแล้ว':'DONE',
};
export function normalizeStatus(s) {
  const m = MAP[s]; return m && PRISMA_ENUM.has(m) ? m : undefined;
}
export const DEFAULT_STATUS_CODE = 'UNASSIGNED';
