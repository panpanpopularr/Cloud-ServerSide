
export const metadata = { title: 'Teamulate' };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: 'ui-sans-serif, system-ui', background: '#0b0f14', color: '#e6edf3' }}>
        <div style={{ display:'flex', gap:16, padding:16 }}>
          <aside style={{ width:280 }}>
            <h1 style={{ marginTop:0 }}>Teamulate</h1>
            <p style={{ opacity:.8, fontSize:14 }}>Cloud-inspired collaborative workspace (MVP)</p>
            <div style={{ fontSize:12, opacity:.7, marginTop:16 }}>API: http://localhost:4000</div>
            <div style={{ fontSize:12, opacity:.7 }}>WebSocket live activity enabled</div>
          </aside>
          <main style={{ flex:1 }}>{children}</main>
        </div>
      </body>
    </html>
  );
}
