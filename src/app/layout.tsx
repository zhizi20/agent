import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '员工心声助手 - 倾听每一个声音',
  description: '一个温暖的员工心声平台，让每个声音都被听见、被理解、被回应。',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className="antialiased min-h-screen">{children}</body>
    </html>
  );
}
