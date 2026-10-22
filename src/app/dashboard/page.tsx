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
      label: "Pengajuan",
      deskripsi: "Buat, konfirmasi & periksa pengajuan invoicing.",
      icon: "📋"
    }] : []),
    ...(user.role !== "admin" ? [{
      href: "/summary-po",
      label: "Summary PO",
      deskripsi: "Ringkasan nilai PO, nilai GR, dan saldo per tahun.",
      icon: "📊"
    }] : []),
    ...(user.role !== "admin" ? [{
      href: "/dashboard/outstanding",
      label: "Outstanding & Aging",
      deskripsi: "Monitoring piutang belum lunas, jadwal jatuh tempo, dan aging schedule.",
      icon: "💰"
    }] : []),
    ...(user.role === "petugas" ? [{
      href: "/data-referensi/personel",
      label: "Data Referensi",
      deskripsi: "Personel, Rate Card, PO, User XL, Pemetaan, Kalender Kerja.",
      icon: "📁"
    }] : []),
    ...(user.role !== "admin" ? [{
      href: "/dashboard/analisa-durasi",
      label: "Analisa Durasi Proses",
      deskripsi: "Rata-rata hari submit CAC sampai invoice disetujui, per User XL.",
      icon: "⏱️"
    }] : []),
    ...(user.role === "admin" ? [{
      href: "/admin/akun",
      label: "Akun & Akses",
      deskripsi: "Daftarkan email, atur peran (Input Data / Checker), aktifkan/nonaktifkan akun.",
      icon: "👥"
    }] : []),
    ...(user.role === "petugas" || user.role === "admin" ? [{
      href: "/kelola-data",
      label: "Kelola Data",
      deskripsi: "Reset massal data uji/salah unggah (Personel, PO, Rate Card, Pengajuan, dll).",
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
