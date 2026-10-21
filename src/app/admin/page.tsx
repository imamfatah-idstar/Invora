import { redirect } from "next/navigation";
import { userSaatIni } from "@/lib/session-server";

// Contoh halaman khusus Administrator — membuktikan pembatasan PER ROLE
// (bukan cuma per login) juga ditegakkan di server.
export default async function HalamanAdmin() {
  const user = await userSaatIni();

  if (!user) {
    redirect("/");
  }
  if (user.role !== "admin") {
    redirect("/dashboard"); // login sah, tapi role tidak berhak -> ditolak
  }

  return (
    <main style={{ maxWidth: 480, margin: "80px auto", fontFamily: "sans-serif" }}>
      <h1>Halaman Khusus Administrator</h1>
      <p>Kalau Anda melihat ini, berarti role Anda benar-benar &quot;admin&quot;.</p>
      <a href="/dashboard">&larr; Kembali</a>
    </main>
  );
}
