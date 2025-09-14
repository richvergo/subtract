import type { Metadata } from "next";
import "./globals.css";
import Providers from "./components/Providers";
import { Sidebar } from "@/components/Sidebar";

export const metadata: Metadata = {
  title: "vergo - Automation Platform",
  description: "Manage your automation agents and login credentials",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <div style={{ display: "flex", minHeight: "100vh" }}>
            <Sidebar />
            <main style={{ 
              flex: 1, 
              marginLeft: "240px", 
              padding: "24px",
              minHeight: "100vh",
              backgroundColor: "#f9f9f9"
            }}>
              {children}
            </main>
          </div>
        </Providers>
      </body>
    </html>
  );
}