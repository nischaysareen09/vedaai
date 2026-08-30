import type { Metadata } from "next";
import { Geist, Geist_Mono, Fraunces } from "next/font/google";
import "./globals.css";
import { TeacherProfileProvider } from "@/lib/teacher-profile";
import TeacherOnboarding from "@/components/TeacherOnboarding";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Display face used sparingly for headlines/empty-state titles — the one
// deliberate typographic accent against the Geist UI face everywhere else.
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["500", "600"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "VedaAI - AI Teacher's Toolkit",
  description: "AI-powered assessment grading and evaluation platform for teachers",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <TeacherProfileProvider>
          {children}
          <TeacherOnboarding />
        </TeacherProfileProvider>
      </body>
    </html>
  );
}