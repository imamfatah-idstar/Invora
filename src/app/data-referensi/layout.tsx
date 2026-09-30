import { wajibRole } from "@/lib/require-role";
import Topbar from "@/components/topbar";

// Data referensi (Personel, Rate Card, PO/Item, User XL, Pemetaan, Kalender
// Kerja) dikelola oleh peran "Input Data" (nilai DB tetap "petugas" — lihat
// src/lib/role-label.ts) — dipisahkan dari Administrator sesuai permintaan
// pengguna (lihat PROJECT_INSTRUCTIONS.md bagian 18 & 20). Administrator
// sekarang HANYA mengatur akun/akses (lihat /admin/akun) — tidak ada lagi
// data operasional/finansial di bawah Administrator.
const MENU = [
  { href: "/data-referensi/personel", label: "Personel" },
  { href: "/data-referensi/rate-card", label: "Rate Card" },
  { href: "/data-referensi/user-xl", label: "User XL" },
  { href: "/data-referensi/po", label: "PO / Item" },
  { href: "/data-referensi/pemetaan", label: "Pemetaan Personel ↔ PO" },
  { href: "/data-referensi/kalender", label: "Kalender Kerja" },
];

export default async function DataReferensiLayout({ children }: { children: React.ReactNode }) {
  const user = await wajibRole(["petugas"]);

  return (
    <>
      <Topbar nama={user.nama} role={user.role} />
      <div className="admin-shell">
        <nav className="admin-sidebar">
          <a href="/dashboard" className="back-link">&larr; Dashboard</a>
          <h3>Data Referensi</h3>
          <ul className="admin-nav">
            {MENU.map((m) => (
              <li key={m.href}><a href={m.href}>{m.label}</a></li>
            ))}
          </ul>
        </nav>
        <main className="admin-content">{children}</main>
      </div>
    </>
  );
}
