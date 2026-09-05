import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  icons: { icon: '/favicon.svg' },
  title: '사과 쟁탈전 | too many apples',
  description:
    '회원가입 없이 친구와 즐기는 2~8인 사과 게임. 같은 보드에서 2분 동안 합이 10인 사과를 모으세요.',
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
