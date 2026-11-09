import { Suspense } from "react";
import ResetPasswordClient from "./reset-password-client";

export const metadata = {
  title: "Reset Kata Sandi — INVORA IDStar",
  description: "Atur ulang kata sandi akun INVORA Anda",
};

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: "center" }}>Memuat formulir verifikasi...</div>}>
      <ResetPasswordClient />
    </Suspense>
  );
}

