"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

// Komponen berbagi untuk "Hapus Terpilih" (bagian 48) — dipakai di tabel
// Personel, PO, Rate Card, Pemetaan Personel-PO. Melakukan DELETE satu-satu
// ke endpoint yang SUDAH ADA per baris (bukan endpoint massal baru) supaya
// otomatis mewarisi pengecekan foreign key yang sudah ada di tiap endpoint
// (409 kalau masih dipakai di data lain) — baris yang gagal dihapus
// dilaporkan, baris yang berhasil tetap terhapus.
export default function HapusTerpilih({ urlUntuk, jumlah, disabled }: { urlUntuk: () => string[]; jumlah: number; disabled?: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function hapusSemuaTerpilih() {
    if (jumlah === 0) return;
    if (!window.confirm(`Hapus ${jumlah} data terpilih? Aksi ini tidak bisa dibatalkan.`)) return;
    setLoading(true);
    const urls = urlUntuk();
    let berhasil = 0;
    const gagal: string[] = [];
    for (const url of urls) {
      try {
        const res = await fetch(url, { method: "DELETE" });
        if (res.ok) berhasil++;
        else {
          const d = await res.json().catch(() => ({}));
          gagal.push(d.error ?? `Gagal: ${url}`);
        }
      } catch {
        gagal.push(`Gagal koneksi: ${url}`);
      }
    }
    setLoading(false);
    if (gagal.length > 0) {
      alert(`${berhasil} berhasil dihapus, ${gagal.length} gagal:\n\n${gagal.slice(0, 10).join("\n")}`);
    }
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={hapusSemuaTerpilih}
      disabled={disabled || jumlah === 0 || loading}
      className="btn-danger-text"
      style={{ border: "1px solid var(--color-danger, #c0392b)", borderRadius: 6, padding: "4px 10px" }}
    >
      {loading ? "Menghapus..." : `Hapus Terpilih (${jumlah})`}
    </button>
  );
}
