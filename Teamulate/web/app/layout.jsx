import './globals.css';

export const metadata = {
  title: 'Teamulate',
};

export default function RootLayout({ children }) {
  return (
    
    <html lang="en">
      <body style={{ background:'#0b1220', color:'#e6edf3' }}>
        {children}
      </body>
    </html>
  );
}
