// web/middleware.js
import { NextResponse } from 'next/server';

export function middleware(req) {
  const { pathname } = req.nextUrl;
  const ua = req.headers.get('user-agent') || '';

  // allow health checks
  if (pathname === '/health' || ua.includes('ELB-HealthChecker')) {
    return NextResponse.next();
  }

  // ตัวอย่าง rule: เด้ง root -> /login
  if (pathname === '/') {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // ไม่จับ api, ไฟล์ static, favicon และ /health
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|health).*)'],
};
