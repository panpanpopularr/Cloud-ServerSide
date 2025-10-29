'use client';
import { Suspense } from 'react';
import LoginInner from './ui'; // ย้ายโค้ดเดิมทั้งหมดไปไฟล์นี้ (ดูด้านล่าง)

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}
