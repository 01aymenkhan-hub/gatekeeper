import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { LayoutProvider } from "@/context/LayoutContext";

export const metadata: Metadata = {
  title: "GATE KEEPER - Enterprise Visitor & Gate Management System",
  description: "Advanced gate access control, vehicle tracking, Pakistani CNIC & Driving License OCR registration",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var theme = localStorage.getItem('gk_theme');
                if (theme === 'dark') {
                  document.documentElement.classList.add('dark');
                  document.documentElement.style.colorScheme = 'dark';
                } else {
                  document.documentElement.classList.remove('dark');
                  document.documentElement.style.colorScheme = 'light';
                }
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col antialiased">
        <AuthProvider>
          <LayoutProvider>{children}</LayoutProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
