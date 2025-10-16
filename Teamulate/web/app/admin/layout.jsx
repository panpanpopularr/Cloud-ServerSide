'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiGet } from '@/lib/api';

export default function AdminLayout({ children }) {
  const router = useRouter();

  useEffect(() => {
    async function check() {
      try {
        const r = await apiGet('/auth/me');
        const role = (r?.user?.role || '').toString().toLowerCase();
        if (role !== 'admin') router.replace('/workspace');
      } catch {
        router.replace('/login');
      }
    }
    check();
  }, [router]);

  return <>{children}</>;
}
