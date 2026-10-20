import { userSaatIni } from "@/lib/session-server";
import MvpPortalClient from "@/components/mvp-portal-client";

export const metadata = {
  title: "🧾 Invora — Sistem Invoicing XL & Request GR (MVP 1–3)",
  description: "Platform otomasi penagihan dan alur Request GR Customer XL Smart — Mengintegrasikan MVP 1, MVP 2, MVP 2b, dan MVP 3.",
};

export default async function HomePage() {
  let user = null;
  let dbStatus: "connected" | "paused" | "error" = "connected";
  let dbErrorMsg: string | undefined = undefined;

  try {
    user = await userSaatIni();
  } catch (error: unknown) {
    dbStatus = "paused";
    dbErrorMsg = error instanceof Error ? error.message : "Tidak dapat terhubung ke database";
  }

  return (
    <MvpPortalClient
      user={user ? { id: user.id, nama: user.nama, email: user.email, role: user.role } : null}
      dbStatus={dbStatus}
      dbErrorMsg={dbErrorMsg}
    />
  );
}
