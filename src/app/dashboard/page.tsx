import { redirect } from "next/navigation";
import { userSaatIni } from "@/lib/session-server";
import Topbar from "@/components/topbar";

export default async function Dashboard() {
  const user = await userSaatIni();
  if (!user) redirect("/login");

  return (
    <>
      <Topbar nama={user.nama} role={user.role} />
      <main className="page">
        <h1>Halo, {user.nama}</h1>
        <p className="subtitle">Ini tahap pengembangan lokal — data yang ditampilkan adalah data contoh.</p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginTop: 20 }}>
          {user.role !== "admin" && (
            <a href="/pengajuan" className="card" style={{ display: "block" }}>
              <h3>Pengajuan</h3>
              <p className="subtitle" style={{ marginBottom: 0 }}>Buat, konfirmasi &amp; periksa pengajuan invoicing.</p>
            </a>
          )}
          {user.role !== "admin" && (
            <a href="/summary-po" className="card" style={{ display: "block" }}>
              <h3>Summary PO</h3>
              <p className="subtitle" style={{ marginBottom: 0 }}>Ringkasan nilai PO, nilai GR, dan saldo per tahun.</p>
            </a>
          )}
          {user.role === "petugas" && (
            <a href="/data-referensi/personel" className="card" style={{ display: "block" }}>
              <h3>Data Referensi</h3>
              <p className="subtitle" style={{ marginBottom: 0 }}>Personel, Rate Card, PO, User XL, Pemetaan, Kalender Kerja.</p>
            </a>
          )}
          {user.role !== "admin" && (
            <a href="/dashboard/analisa-durasi" className="card" style={{ display: "block" }}>
              <h3>Analisa Durasi Proses</h3>
              <p className="subtitle" style={{ marginBottom: 0 }}>Rata-rata hari submit CAC sampai invoice disetujui, per User XL.</p>
            </a>
          )}
          {user.role === "admin" && (
            <a href="/admin/akun" className="card" style={{ display: "block" }}>
              <h3>Akun &amp; Akses</h3>
              <p className="subtitle" style={{ marginBottom: 0 }}>Daftarkan email, atur peran (Input Data / Checker), aktifkan/nonaktifkan akun.</p>
            </a>
          )}
          {(user.role === "petugas" || user.role === "admin") && (
            <a href="/kelola-data" className="card" style={{ display: "block" }}>
              <h3>Kelola Data</h3>
              <p className="subtitle" style={{ marginBottom: 0 }}>Reset massal data uji/salah unggah (Personel, PO, Rate Card, Pengajuan, dll).</p>
            </a>
          )}
        </div>
      </main>
    </>
  );
}
