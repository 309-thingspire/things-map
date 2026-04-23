import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: "things-map — 커뮤니티 맛집 지도",
  description: "커뮤니티 기반 맛집 지도 서비스",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const naverClientId = process.env.NEXT_PUBLIC_NAVER_MAPS_CLIENT_ID;
  return (
    <html lang="ko" className="h-full antialiased">
      <head>
        {/* Pretendard 가변 폰트 */}
        <link
          rel="stylesheet"
          as="style"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
        {/* 네이버 지도 SDK */}
        {naverClientId && (
          <Script
            src={`https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${naverClientId}`}
            strategy="beforeInteractive"
          />
        )}
      </head>
      <body className="h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
