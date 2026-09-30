import type { Role } from "@/lib/auth";

// Label yang ditampilkan ke pengguna — SENGAJA berbeda dari nilai role di
// basis data ("petugas" tetap dipakai di kode/DB/audit log supaya tidak perlu
// migrasi berisiko di banyak file). Ditambahkan supaya di layar jelas kalau
// peran "petugas" itu peran INPUT DATA — bukan Administrator — sesuai
// permintaan pengguna (lihat PROJECT_INSTRUCTIONS.md bagian 20).
const LABEL_ROLE: Record<Role, string> = {
  admin: "Admin",
  petugas: "Input Data",
  checker: "Checker",
};

export function labelRole(role: string): string {
  return LABEL_ROLE[role as Role] ?? role;
}
