import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/toaster";

export const metadata: Metadata = {
  title: "RepoMind - AI Repository Intelligence",
  description: "AI-Integrated Repository Intelligence Platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background antialiased">
        <ThemeProvider defaultTheme="dark" storageKey="repomind-theme">
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}


