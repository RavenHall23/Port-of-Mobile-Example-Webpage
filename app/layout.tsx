import React from "react";
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "./styles/patterns.css";
import { Providers } from './providers'
import Link from "next/link";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Warehouse Management System",
  description: "Track and manage warehouse utilization",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <Providers>
          <nav className="bg-white shadow-sm">
            <div className="container mx-auto px-4 py-3">
              <div className="flex items-center justify-between">
                <Link href="/" className="text-xl font-bold text-gray-800">
                  Warehouse System
                </Link>
                <div className="flex space-x-4">
                  <Link
                    href="/dashboard"
                    className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                  >
                    Dashboard
                  </Link>
                </div>
              </div>
            </div>
          </nav>
          <main>{children}</main>
        </Providers>
      </body>
    </html>
  );
}
