"use client";
import { useRouter } from "next/navigation";

export default function TombolHapusLampiran({ pengajuanId, lampiranId, konfirmasi }: { pengajuanId: number; lampiranId: number; konfirmasi: string }) {
  const router = useRouter();
  async function hapus() {
    if (!window.confirm(konfirmasi)) return;
    const res = await fetch(`/api/pengajuan/${pengajuanId}/lampiran/${lampiranId}`, { method: "DELETE" });
    if (!res.ok) { const d = await res.json().catch(() => ({})); alert(d.error ?? "Gagal menghapus."); return; }
    router.refresh();
  }
  return <button onClick={hapus} className="btn-danger-text">Hapus</button>;
}
