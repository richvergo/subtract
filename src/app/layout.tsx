import type { Metadata } from "next";
import "./globals.css";
import Providers from "./components/Providers";
import ConditionalLayout from "./components/ConditionalLayout";
import ConnectionValidator from "./components/system/ConnectionValidator";
import BasicWorkflowSmokeButton from "./components/dev/BasicWorkflowSmokeButton";

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
      <body style={{ margin: 0, fontFamily: "Arial, sans-serif" }}>
        <Providers>
          <ConnectionValidator showDetails={process.env.NODE_ENV === 'development'} />
          <ConditionalLayout>
            {children}
          </ConditionalLayout>
          <BasicWorkflowSmokeButton showDetails={process.env.NODE_ENV === 'development'} />
        </Providers>
      </body>
    </html>
  );
}