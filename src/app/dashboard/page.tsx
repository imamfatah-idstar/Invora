import { redirect } from "next/navigation";
import { userSaatIni } from "@/lib/session-server";
import Topbar from "@/components/topbar";
import DashboardView, { MenuItem } from "./dashboard-view";
import { getDashboardArAnalytics } from "@/lib/ar-analytics";

export default async function Dashboard() {
  const user = await userSaatIni();
  if (!user) redirect("/");

  const canAdmin = user.role === "admin";
  const canPetugas = user.role === "petugas";
  const canChecker = user.role === "checker";

  const arAnalytics = await getDashboardArAnalytics(30);

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
    ...(canPetugas || canChecker || canAdmin ? [{
      href: "/dashboard/outstanding",
      label: "Outstanding & Aging AR",
      deskripsi: "Monitor unpaid receivables, aging buckets (0-30, 31-60, 61-90, >90d), and overdue alerts.",
      icon: "💰"
    }] : []),
    ...(canPetugas || canChecker || canAdmin ? [{
      href: "/dashboard/plan-vs-actual",
      label: "Inv Plan vs Actual",
      deskripsi: "Compare planned invoicing targets against actual issued invoices & verified collections.",
      icon: "📈"
    }] : []),
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
      <Topbar nama={user.nama} role={user.role} email={user.email} roles={user.roles} />
      <DashboardView
        user={{ nama: user.nama, role: user.role, email: user.email }}
        menu={menu}
        arAnalytics={arAnalytics}
      />
    </>
  );
}
