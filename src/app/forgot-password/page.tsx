import { Suspense } from "react";
import ForgotPasswordClient from "./forgot-password-client";

export const metadata = {
  title: "Forgot Password — INVORA IDStar",
  description: "Reset your INVORA account password via email verification",
};

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: "center" }}>Loading...</div>}>
      <ForgotPasswordClient />
    </Suspense>
  );
}
