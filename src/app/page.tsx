import { redirect } from "next/navigation";
import { userSaatIni } from "@/lib/session-server";
import LoginClient from "./login-client";

export const metadata = {
  title: "Masuk — INVORA (Invoice Operations & Revenue Assurance)",
  description: "Masuk ke sistem INVORA (Invoice Operations & Revenue Assurance) IDStar Group",
};

export default async function HomePage() {
  try {
    const user = await userSaatIni();
    if (user) {
      redirect("/dashboard");
    }
  } catch (err: unknown) {
    if (
      err &&
      typeof err === "object" &&
      "digest" in err &&
      typeof (err as { digest?: string }).digest === "string" &&
      (err as { digest: string }).digest.startsWith("NEXT_REDIRECT")
    ) {
      throw err;
    }
  }

  return <LoginClient />;
}
