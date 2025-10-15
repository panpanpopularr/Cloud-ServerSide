// web/app/layout.jsx
export const metadata = {
  title: 'Teamulate',
  description: 'Cloud-inspired collaborative workspace (MVP)',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ background: '#0b1220', color: '#e6edf3', minHeight: '100vh' }}>
        {children}
      </body>
    </html>
  );
}
