import type { Metadata, Viewport } from "next";

import "./styles.css";

export const metadata: Metadata = {
  title: "Auto Bros OS",
  description: "AI-first operating system for Auto Bros Garage",
};

export const viewport: Viewport = {
  colorScheme: "dark",
  themeColor: "#0b0c0e",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
