import Logo from "./logo";
import TombolKeluarTopbar from "./tombol-keluar-topbar";
import { labelRole } from "@/lib/role-label";
import { getCleanDisplayName } from "@/lib/user-roles";

export default function Topbar({
  nama,
  role,
  email,
}: {
  nama: string;
  role: string;
  email?: string;
}) {
  const cleanName = getCleanDisplayName(email, nama);
  return (
    <div className="topbar">
      <a href="/dashboard" className="topbar-brand" title="INVORA — Invoice Operations & Revenue Assurance">
        <Logo />
        <span>🧾 INVORA</span>
      </a>
      <div className="topbar-user">
        <span className="topbar-user-name">{cleanName}</span>
        <span className="topbar-role-badge">{labelRole(role)}</span>
        <TombolKeluarTopbar />
      </div>
    </div>
  );
}
