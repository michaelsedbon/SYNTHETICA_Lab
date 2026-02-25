import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Fab Planner — Fabrication Planning",
  description: "Production planning dashboard for prosthesis manufacturing",
  icons: {
    icon: "/icon.png",
    apple: "/icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#1e1e1e" />
      </head>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
