import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "CineMatch",
  description: "Simple movie and TV recommendation engine."
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <main className="container page-gradient min-h-screen py-8">{children}</main>
      </body>
    </html>
  );
}
