import { redirect } from "next/navigation";
import { wajibRole } from "@/lib/require-role";

export const metadata = {
  title: "Estimasi Jadwal Cair (Cash-in Forecasting) | INVORA",
  description: "Proyeksi arus kas masuk, jadwal pencairan invoice, dan simulasi skenario likuiditas",
};

export default async function HalamanCashInForecast() {
  await wajibRole(["petugas", "checker", "admin"]);
  // Sementara dinonaktifkan atas permintaan user
  redirect("/dashboard");
}
