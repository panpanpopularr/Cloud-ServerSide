export function actorOf(req) {
  // แน่ใจว่า ensureAuth เติมข้อมูลไว้แล้ว: { uid, name, email, role }
  return req?.user?.name || req?.user?.email || req?.user?.uid || 'system';
}
