import Logo from "./logo";
import TombolKeluarTopbar from "./tombol-keluar-topbar";
import { labelRole } from "@/lib/role-label";

export default function Topbar({ nama, role }: { nama: string; role: string }) {
  return (
    <div className="topbar">
      <a href="/dashboard" className="topbar-brand">
        <Logo />
        <span>🧾 Invora</span>
      </a>
      <div className="topbar-user">
        <span className="topbar-user-name">{nama}</span>
        <span className="topbar-role-badge">{labelRole(role)}</span>
        <TombolKeluarTopbar />
      </div>
    </div>
  );
}
