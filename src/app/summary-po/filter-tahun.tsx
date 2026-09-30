"use client";
import { useRouter } from "next/navigation";

export default function FilterTahun({ daftarTahun, tahunDipilih }: { daftarTahun: number[]; tahunDipilih: number }) {
  const router = useRouter();

  if (daftarTahun.length === 0) return null;

  return (
    <div className="toolbar" style={{ marginBottom: 0 }}>
      {daftarTahun.map((t) => (
        <button
          key={t}
          type="button"
          onClick={() => router.push(`/summary-po?tahun=${t}`)}
          className={t === tahunDipilih ? "btn btn-primary" : "btn"}
        >
          {t}
        </button>
      ))}
    </div>
  );
}
