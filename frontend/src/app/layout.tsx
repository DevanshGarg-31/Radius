import type { Metadata } from "next";
import { Inter, Manrope } from "next/font/google";
import { SessionProvider } from "@/lib/session";
import "./globals.css";

const manrope = Manrope({ variable: "--font-manrope", subsets: ["latin"], weight: ["500", "600", "700", "800"] });
const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "radius · turn ideas into teams",
    template: "%s · radius",
  },
  description: "Describe what you want to build. Find the people who can help make it happen. Build the team you need.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${manrope.variable} ${inter.variable}`}>
      <body>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
