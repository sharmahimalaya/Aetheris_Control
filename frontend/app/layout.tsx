import "./globals.css";
import type { Metadata } from "next";
import { ThemeProvider } from "./components/ThemeProvider";

export const metadata: Metadata = {
  title: "Aetheris Control — Predictive Maintenance",
  description: "High-level real-time predictive maintenance command center.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
        <style>{`
          .material-symbols-outlined {
            font-variation-settings: 'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24;
          }
        `}</style>
      </head>
      <body className="bg-surface-container-lowest text-on-surface font-body overflow-hidden h-screen">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}