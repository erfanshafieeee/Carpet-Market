import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "بازار فرش ایران", template: "%s | بازار فرش ایران" },
  description: "کشف و مقایسه فرش‌های اصیل ایرانی پیش از مراجعه حضوری"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fa" dir="rtl">
      <body>{children}</body>
    </html>
  );
}

