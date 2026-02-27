import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Transit Accessibility Index — Jakarta",
  description:
    "Interactive map scoring every H3 hexagon in Jakarta on transit accessibility to essential services. Click anywhere for AI-generated analysis.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-surface text-white antialiased`}>
        {children}
      </body>
    </html>
  );
}
