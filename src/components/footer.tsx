"use client";

import { usePathname } from "next/navigation";
import Logo from "./logo";

// Alamat resmi IDStar — tampil di semua halaman aplikasi kecuali halaman login
// dan disembunyikan otomatis saat cetak dokumen via @media print.
export default function Footer() {
  const pathname = usePathname();

  // Sembunyikan footer khusus di halaman login
  if (pathname === "/" || pathname === "/login") {
    return null;
  }

  return (
    <footer className="app-footer">
      <Logo height={22} variant="color" />
      <div className="app-footer-text">
        <div><b>PT IDStar Cipta Teknologi</b> &middot; The Bellagio Mansion, Jl. Mega Kuningan Timur II No. Kav. E6-1, Ground floor, RT.5/RW.2</div>
        <div>Kuningan, Kuningan Tim., Kecamatan Setiabudi, Kota Jakarta Selatan, Daerah Khusus Ibukota Jakarta 12950</div>
      </div>
    </footer>
  );
}

