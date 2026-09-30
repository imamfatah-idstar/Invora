import Logo from "./logo";

// Alamat resmi IDStar — tampil di semua halaman (lihat globals.css .app-footer,
// disembunyikan otomatis saat cetak dokumen CAC/BAST via @media print). Dibuat
// 2 baris sesuai permintaan pengguna.
export default function Footer() {
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
