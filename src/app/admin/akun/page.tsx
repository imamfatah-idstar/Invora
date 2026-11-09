import { db } from "@/db";
import { users } from "@/db/schema";
import { userSaatIni } from "@/lib/session-server";
import { desc } from "drizzle-orm";
import FormTambahAkun from "./akun-form";
import BarisAksiAkun from "./akun-row-actions";

export default async function HalamanAkun() {
  const [daftar, userSekarang] = await Promise.all([
    db.select().from(users).orderBy(desc(users.id)),
    userSaatIni(),
  ]);

  return (
    <div>
      <h1>Accounts &amp; Permissions</h1>
      <p className="subtitle">
        Register authorized user emails (must use <b>@idstar.group</b> domain), assign <b>Data Entry</b> role
        (create &amp; confirm submissions, manage reference data) or <b>Checker</b> role (review &amp; approve submissions).
        Administrators manage user access only and do not handle operational financial entries.
      </p>
      <FormTambahAkun />
      <div className="table-wrap">
        <table>
          <thead><tr><th>Full Name</th><th>Email</th><th>Role Permissions (Checklist) &amp; Status</th></tr></thead>
          <tbody>
            {daftar.map((u) => (
              <tr key={u.id}>
                <td style={{ fontWeight: 600 }}>{u.nama}</td>
                <td>{u.email}</td>
                <td>
                  <BarisAksiAkun
                    id={u.id}
                    role={u.role}
                    aktif={u.aktif}
                    kuncSendiri={u.id === userSekarang?.id}
                  />
                </td>
              </tr>
            ))}
            {daftar.length === 0 && <tr><td colSpan={3} className="table-empty">No user accounts found.</td></tr>}
          </tbody>
        </table>
      </div>
      <p className="subtitle" style={{ marginTop: 16 }}>
        💡 User accounts cannot be permanently deleted (preserved for audit trail and submission history) — deactivate
        an account if access is revoked. Inactive accounts are automatically blocked at sign-in.
      </p>
    </div>
  );
}
