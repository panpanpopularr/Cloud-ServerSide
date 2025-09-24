export const metadata = { title: 'Teamulate' };

export default function RootLayout({ children }) {
  return (
    <html lang="th">
      <body style={{background:'#0b1220', color:'#e6edf3', fontFamily:'system-ui,Segoe UI,Arial'}}>
        <div style={{maxWidth:1100, margin:'24px auto'}}>
          <h1 style={{fontSize:36, margin:'0 0 8px'}}>Teamulate</h1>
          <div style={{opacity:.8, marginBottom:16}}>
            Cloud-inspired collaborative workspace (MVP)
            <div style={{fontSize:12, opacity:.6}}>API: http://localhost:4000 · WebSocket live activity enabled</div>
          </div>
          {children}
        </div>
      </body>
    </html>
  );
}