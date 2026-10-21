import { redirect } from "next/navigation";
import { userSaatIni } from "@/lib/session-server";
import Topbar from "@/components/topbar";

type MenuItem = { href: string; label: string; deskripsi: string };

export default async function Dashboard() {
  const user = await userSaatIni();
  if (!user) redirect("/");

  // Daftar isi (bagian 48, dipindah dari grid kartu ke sidebar kiri —
  // mengikuti pola yang sama seperti sidebar Data Referensi & Admin) —
  // disaring per role, urutan sama seperti sebelumnya.
  const menu: MenuItem[] = [
    ...(user.role !== "admin" ? [{ href: "/pengajuan", label: "Pengajuan", deskripsi: "Buat, konfirmasi & periksa pengajuan invoicing." }] : []),
    ...(user.role !== "admin" ? [{ href: "/summary-po", label: "Summary PO", deskripsi: "Ringkasan nilai PO, nilai GR, dan saldo per tahun." }] : []),
    ...(user.role === "petugas" ? [{ href: "/data-referensi/personel", label: "Data Referensi", deskripsi: "Personel, Rate Card, PO, User XL, Pemetaan, Kalender Kerja." }] : []),
    ...(user.role !== "admin" ? [{ href: "/dashboard/analisa-durasi", label: "Analisa Durasi Proses", deskripsi: "Rata-rata hari submit CAC sampai invoice disetujui, per User XL." }] : []),
    ...(user.role === "admin" ? [{ href: "/admin/akun", label: "Akun & Akses", deskripsi: "Daftarkan email, atur peran (Input Data / Checker), aktifkan/nonaktifkan akun." }] : []),
    ...(user.role === "petugas" || user.role === "admin" ? [{ href: "/kelola-data", label: "Kelola Data", deskripsi: "Reset massal data uji/salah unggah (Personel, PO, Rate Card, Pengajuan, dll)." }] : []),
  ];

  return (
    <>
      <Topbar nama={user.nama} role={user.role} />
      <div className="admin-shell">
        <nav className="admin-sidebar">
          <h3>Daftar Isi</h3>
          <ul className="admin-nav">
            {menu.map((m) => (
              <li key={m.href}><a href={m.href}>{m.label}</a></li>
            ))}
          </ul>
        </nav>
        <main className="admin-content">
          <h1>Halo, {user.nama}</h1>
          <p className="subtitle">Ini tahap pengembangan lokal — data yang ditampilkan adalah data contoh.</p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginTop: 20 }}>
            {menu.map((m) => (
              <a key={m.href} href={m.href} className="card" style={{ display: "block" }}>
                <h3>{m.label}</h3>
                <p className="subtitle" style={{ marginBottom: 0 }}>{m.deskripsi}</p>
              </a>
            ))}
          </div>
        </main>
      </div>
    </>
  );
}
