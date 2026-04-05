import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Documentation",
  description:
    "Complete Megent SDK documentation. Learn how to control AI agents with policy YAML, enforce runtime rules, mask PII, and implement governance across Python, TypeScript, LangChain, CrewAI, and OpenAI frameworks.",
  alternates: {
    canonical: "/doc",
  },
  keywords: [
    "Megent documentation",
    "AI agent SDK",
    "policy YAML",
    "PII masking",
    "agent governance docs",
    "LangChain integration",
    "CrewAI integration",
    "OpenAI agents SDK",
  ],
  openGraph: {
    title: "Megent Documentation",
    description:
      "Complete guides and API reference for controlling AI agents with Megent - policy enforcement, PII masking, and governance.",
    url: "https://megent.dev/doc",
    siteName: "Megent",
    type: "website",
    images: [
      {
        url: "/freepik__adjust__68767.png",
        width: 1200,
        height: 630,
        alt: "Megent Documentation",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Megent Documentation",
    description:
      "Complete guides and API reference for controlling AI agents with Megent - policy enforcement, PII masking, and governance.",
    images: ["/freepik__adjust__68767.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
