import type { Metadata } from "next";
import { Fraunces, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

// Display serif con carácter editorial para titulares y cifras.
const fraunces = Fraunces({
  variable: "--ff-display",
  subsets: ["latin"],
  display: "swap",
});

const geistSans = Geist({
  variable: "--ff-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--ff-mono",
  subsets: ["latin"],
  display: "swap",
});

const SITE = "https://due-diligence-datos.local";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: {
    default: "Legamio Audit · Due diligence de datos · Habeas Data",
    template: "%s · Legamio Audit",
  },
  description:
    "Revisión asistida por IA de autorizaciones de tratamiento de datos personales y reporte a centrales de riesgo en contratos de crédito. Marco: Ley 1266 de 2008, Ley 1581 de 2012 y Decreto 1377 de 2013 (Colombia).",
  keywords: [
    "habeas data",
    "centrales de riesgo",
    "Ley 1266 de 2008",
    "Ley 1581 de 2012",
    "protección de datos",
    "due diligence",
    "Datacrédito",
    "OCR contratos",
  ],
  authors: [{ name: "HackLegalTech" }],
  category: "legaltech",
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    locale: "es_CO",
    title: "Legamio Audit · Due diligence de datos",
    description:
      "Identifica en contratos PDF (con y sin OCR) si autorizan el reporte a centrales de riesgo. La IA prioriza; el abogado decide.",
    siteName: "Legamio Audit",
  },
  twitter: {
    card: "summary_large_image",
    title: "Legamio Audit · Due diligence de datos",
    description:
      "Revisión asistida por IA de autorizaciones y reporte a centrales de riesgo en contratos de crédito.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${fraunces.variable} ${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="paper text-ink min-h-full flex flex-col">{children}</body>
    </html>
  );
}
