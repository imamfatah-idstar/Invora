"use client";
import { useRouter } from "next/navigation";

export default function TombolKeluarTopbar() {
  const router = useRouter();
  async function keluar() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }
  return (
    <button onClick={keluar} className="btn" style={{ padding: "5px 12px", fontSize: 13, background: "rgba(255,255,255,0.1)", borderColor: "rgba(255,255,255,0.25)", color: "white" }}>
      Keluar
    </button>
  );
}
