import type { Metadata } from "next";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { Geist, Geist_Mono } from "next/font/google";
import WalletProviderWrapper from "@/components/WalletProviderWrapper";
import MUIProvider from "@/components/MUIProvider"; // Direct import without dynamic()
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "My Trading Bot",
  description: "A mobile responsive trading bot built with Next.js and MUI",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head />
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <MUIProvider>
          <WalletProviderWrapper>{children}</WalletProviderWrapper>
        </MUIProvider>
      </body>
    </html>
  );
}
