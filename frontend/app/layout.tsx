import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Viora | Secure, real-time messaging',
  description: 'A modern, secure messaging web application foundation.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased bg-slate-950 text-slate-50 h-screen overflow-hidden flex flex-col">
        {children}
      </body>
    </html>
  );
}
