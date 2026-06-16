import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ops Workflow Automation Platform",
  description:
    "AI-assisted internal operations console with workflow queues, human review, exception handling, and audit logs."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
