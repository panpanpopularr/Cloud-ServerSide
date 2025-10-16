'use client';

import { SWRConfig } from 'swr';

export default function WorkspaceLayout({ children }) {
  return (
    <SWRConfig
      value={{
        revalidateOnFocus: true,     // ✅ refresh data ทุกครั้งเมื่อกลับมาโฟกัสหน้า
        revalidateOnReconnect: true, // ✅ refresh เมื่อเน็ตกลับมาใหม่
        dedupingInterval: 2000,      // ✅ ไม่ดึงซ้ำภายใน 2 วินาที
        provider: () => new Map(),   // ✅ isolate cache ต่อ layout (กัน cache เก่าค้าง)
      }}
    >
      {children}
    </SWRConfig>
  );
}
