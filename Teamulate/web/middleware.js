// web/middleware.js
import { NextResponse } from 'next/server';

export function middleware(req) {
  // ถ้าต้องการให้ root เด้งไป /login เสมอ ก็ทำแค่นี้พอ
  if (req.nextUrl.pathname === '/') {
    return NextResponse.redirect(new URL('/login', req.url));
  }
  return NextResponse.next();
}

// ไม่ต้องแมตช์ /workspace เพื่อหลีกเลี่ยงการเช็คสิทธิ์ฝั่ง edge
export const config = { matcher: ['/', '/login', '/register'] };
