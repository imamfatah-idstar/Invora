import { redirect } from "next/navigation";
import { userSaatIni } from "@/lib/session-server";
import Topbar from "@/components/topbar";
import DashboardView, { MenuItem } from "./dashboard-view";

export default async function Dashboard() {
  const user = await userSaatIni();
  if (!user) redirect("/");

  const menu: MenuItem[] = [
    ...(user.role !== "admin" ? [{
      href: "/pengajuan",
      label: "Invoicing Submissions",
      deskripsi: "Create, confirm & review invoicing submissions.",
      icon: "📋"
    }] : []),
    ...(user.role !== "admin" ? [{
      href: "/summary-po",
      label: "PO Summary",
      deskripsi: "Summary of PO value, GR value, and remaining balance per year.",
      icon: "📊"
    }] : []),
    ...(user.role !== "admin" ? [{
      href: "/dashboard/outstanding",
      label: "Outstanding & Aging",
      deskripsi: "Monitor outstanding receivables, due dates, and aging schedule.",
      icon: "💰"
    }] : []),
    // Cash-in Forecasting temporarily disabled
    ...(user.role === "petugas" ? [{
      href: "/data-referensi/personel",
      label: "Reference Data",
      deskripsi: "Personnel, Rate Cards, POs, Client Approvers, Mappings, Working Calendar.",
      icon: "📁"
    }] : []),
    ...(user.role !== "admin" ? [{
      href: "/dashboard/analisa-durasi",
      label: "Process Duration Analytics",
      deskripsi: "Average turnaround time from CAC submission to invoice approval.",
      icon: "⏱️"
    }] : []),
    ...(user.role === "admin" ? [{
      href: "/admin/akun",
      label: "Accounts & Permissions",
      deskripsi: "Register emails, assign roles (Data Entry / Checker), activate/deactivate accounts.",
      icon: "👥"
    }] : []),
    ...(user.role === "admin" ? [{
      href: "/kelola-data",
      label: "Data Management",
      deskripsi: "Bulk reset test/staging data (Personnel, POs, Rate Cards, Submissions, etc.).",
      icon: "⚙️"
    }] : []),
  ];

  return (
    <>
      <Topbar nama={user.nama} role={user.role} />
      <DashboardView user={{ nama: user.nama, role: user.role }} menu={menu} />
    </>
  );
}
