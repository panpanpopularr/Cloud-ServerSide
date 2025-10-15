export function requireAuth(req, res, next) {
  // ผ่านทั้งกรณี passport local/google
  if (req.isAuthenticated?.() || req.user) return next();
  return res.status(401).json({ error: 'unauthorized' });
}
