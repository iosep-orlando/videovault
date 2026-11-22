import type { Metadata } from "next";
import { Bricolage_Grotesque, Geist } from "next/font/google";
import { AuthProvider } from "@/context/AuthContext";
import Header from "@/components/Header";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
// Títulos con carácter; el texto, en una sans neutra y muy legible.
const bricolage = Bricolage_Grotesque({ variable: "--font-bricolage", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "VideoVault",
  description: "Tu biblioteca privada de vídeos: subí, etiquetá, buscá y reproducí.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${geistSans.variable} ${bricolage.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-lightbox font-sans text-mount">
        <AuthProvider>
          <Header />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
