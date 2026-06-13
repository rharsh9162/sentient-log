import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";

export const metadata = {
  title: "SentientLog — AI-Powered Analytics",
  description:
    "AI-powered web analytics and observability platform. Ask questions about your logs in plain English.",
  icons: {
    icon: "/logo.png",
  },
};

export default function RootLayout({ children }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body>{children}</body>
      </html>
    </ClerkProvider>
  );
}
