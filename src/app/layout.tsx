import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "BoberOS — ОС для настоящих грызунов",
  description: "Шуточная операционная система BoberOS. 45+ приложений, 21 игра, установщик, тёмная тема и многое другое. created by vanya8.",
  keywords: ["BoberOS", "бобёр", "ОС", "шуточная", "игры", "Next.js", "vanya8"],
  authors: [{ name: "vanya8" }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
