import Logo from "./logo";
import TombolKeluarTopbar from "./tombol-keluar-topbar";
import ModalGantiPassword from "./modal-ganti-password";
import { labelRole } from "@/lib/role-label";
import { getCleanDisplayName } from "@/lib/user-roles";

export default function Topbar({
  nama,
  role,
  email,
  roles,
}: {
  nama: string;
  role: string;
  email?: string;
  roles?: string[];
}) {
  const cleanName = getCleanDisplayName(email, nama);
  const hasMultiRole = Boolean(roles && roles.length > 1);

  return (
    <div className="topbar">
      <a href="/dashboard" className="topbar-brand" title="INVORA — Invoice Operations & Revenue Assurance">
        <Logo />
        <span>🧾 INVORA</span>
      </a>
      <div className="topbar-user">
        <span className="topbar-user-name">{cleanName}</span>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span className="topbar-role-badge">{labelRole(role)}</span>
          {hasMultiRole && (
            <a
              href="/pilih-role"
              title="Ganti Peran / Switch Role"
              style={{
                fontSize: 11,
                padding: "2px 7px",
                borderRadius: 4,
                background: "rgba(255,255,255,0.15)",
                color: "#ffffff",
                textDecoration: "none",
                fontWeight: 600,
                border: "1px solid rgba(255,255,255,0.25)",
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                transition: "all 0.15s ease",
              }}
            >
              <span>🔄</span>
              <span>Ganti Role</span>
            </a>
          )}
        </div>
        <ModalGantiPassword />
        <TombolKeluarTopbar />
      </div>
    </div>
  );
}
