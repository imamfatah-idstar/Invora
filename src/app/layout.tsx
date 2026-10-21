import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import Footer from "@/components/footer";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
});

export const metadata: Metadata = {
  title: "INVORA — Invoice Operations & Revenue Assurance (IDStar)",
  description: "INVORA (Invoice Operations & Revenue Assurance) — Platform sistem operasional invoicing & revenue assurance IDStar Group",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" className={plusJakartaSans.variable}>
      <body>
        {children}
        <Footer />
      </body>
    </html>
  );
}
