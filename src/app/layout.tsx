import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '员工心声助手 - 茂佳科技',
  description: '对员工反馈进行分类、归纳并生成响应建议，让每个声音都被听见、被理解、被回应。',
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
