import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const viewport: Viewport = {
  themeColor: "#22d3ee",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  title: "VoxCode – Voice Coding SaaS for Real Engineers",
  description:
    "VoxCode turns what you say into IDE-ready, self-correcting code in real time. Sub-200ms latency, Claude AI, $1/month. Works on Windows, macOS, Linux.",
  metadataBase: new URL("https://KingsFromEarthDevelopment.com"),
  manifest: "/manifest.webmanifest",
  applicationName: "VoxCode",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "VoxCode",
  },
  openGraph: {
    title: "VoxCode – Voice Coding SaaS",
    description: "Voice-to-code that actually ships. $1/month. Works everywhere.",
    url: "https://KingsFromEarthDevelopment.com",
    siteName: "VoxCode",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "VoxCode – Voice Coding for Real Engineers",
    description: "IDE-ready voice-to-code. Auto-fix. Repo-aware. $1/month.",
  },
  alternates: {
    canonical: "https://KingsFromEarthDevelopment.com",
  },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/icon-192.png",
    shortcut: "/icons/icon-192.png",
  },
  keywords: [
    "voice coding", "voice to code", "AI code editor", "developer tools",
    "IDE plugin", "VS Code extension", "voice programming", "SaaS developer tools",
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="VoxCode" />
        <meta name="msapplication-TileColor" content="#020617" />
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-slate-950 text-slate-100 scroll-smooth`}
      >
        {/* Register service worker for PWA / app store */}
        <script
          dangerouslySetInnerHTML={{
            __html: `if('serviceWorker'in navigator){window.addEventListener('load',()=>{navigator.serviceWorker.register('/sw.js').catch(()=>{})})}`,
          }}
        />
        {children}
      </body>
    </html>
  );
}
