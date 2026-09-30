import { wajibRole } from "@/lib/require-role";
import Topbar from "@/components/topbar";

// Administrator SEKARANG HANYA mengatur akun/akses — tidak ada lagi menu
// data operasional/finansial di sini (Kalender Kerja sudah dipindah ke
// /data-referensi/kalender, dikelola peran Input Data). Sesuai permintaan
// pengguna: "Admin hanya mengatur akses ... betul-betul sebagai pemegang
// admin untuk akses, tidak ada hubungannya dengan finance" — lihat
// PROJECT_INSTRUCTIONS.md bagian 20.
const MENU = [
  { href: "/admin/akun", label: "Akun & Akses" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await wajibRole(["admin"]);

  return (
    <>
      <Topbar nama={user.nama} role={user.role} />
      <div className="admin-shell">
        <nav className="admin-sidebar">
          <a href="/dashboard" className="back-link">&larr; Dashboard</a>
          <h3>Administrasi</h3>
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
