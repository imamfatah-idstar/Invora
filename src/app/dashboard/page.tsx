import { redirect } from "next/navigation";
import { userSaatIni } from "@/lib/session-server";
import Topbar from "@/components/topbar";
import DashboardView, { MenuItem } from "./dashboard-view";
import { isAuthorizedForRole } from "@/lib/user-roles";

export default async function Dashboard() {
  const user = await userSaatIni();
  if (!user) redirect("/");

  const canAdmin = isAuthorizedForRole(user.email, "admin") || user.role === "admin";
  const canPetugas = isAuthorizedForRole(user.email, "petugas") || user.role === "petugas";
  const canChecker = isAuthorizedForRole(user.email, "checker") || user.role === "checker";

  const menu: MenuItem[] = [
    ...(canPetugas || canChecker ? [{
      href: "/pengajuan",
      label: "Invoicing Submissions",
      deskripsi: "Create, confirm & review invoicing submissions.",
      icon: "📋"
    }] : []),
    ...(canPetugas || canChecker ? [{
      href: "/summary-po",
      label: "PO Summary",
      deskripsi: "Summary of PO value, GR value, and remaining balance per year.",
      icon: "📊"
    }] : []),
    ...(canPetugas || canChecker ? [{
      href: "/dashboard/outstanding",
      label: "Outstanding & Aging",
      deskripsi: "Monitor outstanding receivables, due dates, and aging schedule.",
      icon: "💰"
    }] : []),
    // Cash-in Forecasting temporarily disabled
    ...(canPetugas ? [{
      href: "/data-referensi/personel",
      label: "Reference Data",
      deskripsi: "Personnel, Rate Cards, POs, Client Approvers, Mappings, Working Calendar.",
      icon: "📁"
    }] : []),
    ...(canPetugas || canChecker ? [{
      href: "/dashboard/analisa-durasi",
      label: "Process Duration Analytics",
      deskripsi: "Average turnaround time from CAC submission to invoice approval.",
      icon: "⏱️"
    }] : []),
    ...(canAdmin ? [{
      href: "/admin/akun",
      label: "Accounts & Permissions",
      deskripsi: "Register emails, assign roles (Data Entry / Checker), activate/deactivate accounts.",
      icon: "👥"
    }] : []),
    ...(canAdmin ? [{
      href: "/kelola-data",
      label: "Data Management",
      deskripsi: "Bulk reset test/staging data (Personnel, POs, Rate Cards, Submissions, etc.).",
      icon: "⚙️"
    }] : []),
  ];

  return (
    <>
      <Topbar nama={user.nama} role={user.role} email={user.email} />
      <DashboardView user={{ nama: user.nama, role: user.role, email: user.email }} menu={menu} />
    </>
  );
}
