import type { Metadata } from 'next';
import { Toaster } from 'react-hot-toast';
import ReduxProvider from '@/store/ReduxProvider';
import './globals.css';

export const metadata: Metadata = {
  title: 'VedaAI — AI Assessment Creator',
  description: 'Generate AI-powered exam papers in seconds',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <ReduxProvider>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: { fontFamily: 'system-ui, sans-serif', fontSize: '14px' },
            }}
          />
        </ReduxProvider>
      </body>
    </html>
  );
}
