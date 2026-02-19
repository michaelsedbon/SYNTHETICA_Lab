import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Experiment Notebooks",
  description: "Browse and read experiment markdown files",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}
        className="antialiased"
      >
        {children}
      </body>
    </html>
  );
}
