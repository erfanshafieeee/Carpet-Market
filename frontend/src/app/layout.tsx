import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "فرش شبستری", template: "%s | فرش شبستری" },
  description: "کشف و مقایسه فرش‌های اصیل ایرانی و ثبت درخواست فروش مستقیم فرش به کارشناسان فرش شبستری"
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fa" dir="rtl">
      <body>{children}</body>
    </html>
  );
}

