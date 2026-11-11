import Topbar from "@/components/topbar";
import { wajibRole } from "@/lib/require-role";

// Data referensi (Personel, Rate Card, PO/Item, User XL, Pemetaan, Kalender
// Kerja) dikelola oleh peran "Input Data" (nilai DB tetap "petugas" — lihat
// src/lib/role-label.ts) — dipisahkan dari Administrator sesuai permintaan
// pengguna (lihat PROJECT_INSTRUCTIONS.md bagian 18 & 20). Administrator
// sekarang HANYA mengatur akun/akses (lihat /admin/akun) — tidak ada lagi
// data operasional/finansial di bawah Administrator.
const MENU = [
  { href: "/data-referensi/personel", label: "Personnel" },
  { href: "/data-referensi/rate-card", label: "Rate Card" },
  { href: "/data-referensi/user-xl", label: "User" },
  { href: "/data-referensi/po", label: "PO / Line Items" },
  { href: "/data-referensi/pemetaan", label: "Personnel ↔ PO Mapping" },
  { href: "/data-referensi/kalender", label: "Working Calendar" },
];

export default async function DataReferensiLayout({ children }: { children: React.ReactNode }) {
  const user = await wajibRole(["petugas"]);

  return (
    <>
      <Topbar nama={user.nama} role={user.role} email={user.email} roles={user.roles} />
      <div className="admin-shell">
        <nav className="admin-sidebar">
          <a href="/dashboard" className="back-link">&larr; Dashboard</a>
          <h3>Reference Data</h3>
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
