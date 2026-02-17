import './globals.css';
import QueryProvider from '@/providers/query-provider';
import { SupabaseProvider } from '@/providers/supabase-provider';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Control | Music Mission Institute',
  description: 'Lernplattform für Kursteilnehmer und Dozenten',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body className="text-slate-900">
        <SupabaseProvider>
          <QueryProvider>{children}</QueryProvider>
        </SupabaseProvider>
      </body>
    </html>
  );
}
