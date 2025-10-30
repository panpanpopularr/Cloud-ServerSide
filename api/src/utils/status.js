// รองรับสถานะทั้ง EN/TH และ map → enum ที่ Prisma ใช้
export const DEFAULT_STATUS_CODE = 'UNASSIGNED';

const MAP_TH_TO_EN = {
  'ยังไม่มอบหมาย': 'UNASSIGNED',
  'กำลังทำ': 'ACTIVE',
  'รอตรวจ': 'REVIEW',
  'เสร็จแล้ว': 'DONE',
  'ยกเลิก': 'CANCELED',
};

const ALLOWED = ['ACTIVE', 'UNASSIGNED', 'CANCELED', 'REVIEW', 'DONE'];

export function normalizeStatus(input) {
  if (!input) return null;
  const raw = String(input).trim();

  // แมทช์ภาษาไทยก่อน
  if (MAP_TH_TO_EN[raw]) return MAP_TH_TO_EN[raw];

  const upper = raw.toUpperCase();
  return ALLOWED.includes(upper) ? upper : null;
}
