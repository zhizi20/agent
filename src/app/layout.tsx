import type { Metadata } from 'next';
import { Noto_Sans_SC } from 'next/font/google';
import './globals.css';
import { Header } from '@/components/header';
import { RoleProvider } from '@/contexts/role-context';

const notoSansSC = Noto_Sans_SC({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: '员工心声助手 - 让每个声音都被听见',
  description: '一个温暖的员工心声平台，让每个声音都被听见、被理解、被回应',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className={`${notoSansSC.className} antialiased`}>
        <RoleProvider>
          <Header />
          <main className="min-h-[calc(100vh-4rem)]">{children}</main>
        </RoleProvider>
      </body>
    </html>
  );
}
