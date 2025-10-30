// web/app/workspace/layout.jsx
export default function WorkspaceLayout({ children }) {
  // ไม่ต้องมี header ซ้ำที่นี่แล้ว ใช้ header จาก app/layout.jsx อย่างเดียว
  return <>{children}</>;
}
