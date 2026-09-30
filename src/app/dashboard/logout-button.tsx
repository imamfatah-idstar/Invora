"use client";

import { useRouter } from "next/navigation";

export default function TombolKeluar() {
  const router = useRouter();

  async function keluar() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return <button onClick={keluar}>Keluar</button>;
}
