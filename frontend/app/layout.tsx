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
      <body className="antialiased bg-slate-950 text-slate-50 min-h-[100dvh] flex flex-col pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
        {children}
      </body>
    </html>
  );
}
