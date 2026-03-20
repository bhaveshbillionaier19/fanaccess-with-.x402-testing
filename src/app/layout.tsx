import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import "@rainbow-me/rainbowkit/styles.css";
import { Providers } from "./providers";
import Navbar from "@/components/Navbar";
import PageTransitionWrapper from "@/components/PageTransitionWrapper";
import { ThemeProvider } from "@/app/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import BottomNav from "@/components/BottomNav";
import AnimatedBackground from "@/components/AnimatedBackground";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Fan Access - Pay To Unlock NFT Content"
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          <Providers>
            <div className="min-h-screen bg-background relative overflow-hidden">
              <AnimatedBackground />
              <Navbar />
              <PageTransitionWrapper>{children}</PageTransitionWrapper>
              <Toaster />
              <BottomNav />
            </div>
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  );
}

