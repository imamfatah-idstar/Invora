"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type BarisHitung = {
  personelId: number; namaPersonel: string;
  nilaiRateDipakai: string | null; hariKerjaDapatDitagihkan: number | null;
  hariKerjaAcuanBulan: number | null; hasilHitung: string | null; error: string | null;
  // Hasil alokasi lintas-PO (bagian 35).
  nilaiPenuh: string | null;
  sudahDialokasikanDiPoLain: string;
  sisaPerluDitagih: string | null;
  akanDitagihkan: string | null;
  sudahLunasBulanIni: boolean;
};

function formatRupiah(nilai: string) {
  return "Rp" + Number(nilai).toLocaleString("id-ID", { minimumFractionDigits: 2 });
}

export default function FormEditPengajuan({
  pengajuanId, poId, periode, personelIdsAwal,
}: { pengajuanId: number; poId: number; periode: string; personelIdsAwal: number[] }) {
  const router = useRouter();
  const [baris, setBaris] = useState<BarisHitung[] | null>(null);
  const [dipilih, setDipilih] = useState<Set<number>>(new Set(personelIdsAwal));
  const [error, setError] = useState<string | null>(null);
  const [loadingHitung, setLoadingHitung] = useState(true);
  const [loadingSimpan, setLoadingSimpan] = useState(false);

  useEffect(() => {
    (async () => {
      setLoadingHitung(true);
      const res = await fetch("/api/pengajuan/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ poId, periode }),
      });
      setLoadingHitung(false);
      if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error ?? "Gagal memuat pratinjau."); return; }
      const data = await res.json();
      setBaris(data.baris);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggle(id: number) {
    setDipilih((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function simpan() {
    setError(null); setLoadingSimpan(true);
    const res = await fetch(`/api/pengajuan/${pengajuanId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ personelIds: Array.from(dipilih) }),
    });
    setLoadingSimpan(false);
    if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error ?? "Gagal menyimpan."); return; }
    router.push(`/pengajuan/${pengajuanId}`);
    router.refresh();
  }

  const total = (baris ?? [])
    .filter((b) => dipilih.has(b.personelId) && b.akanDitagihkan)
    .reduce((acc, b) => acc + Number(b.akanDitagihkan), 0);

  if (loadingHitung) return <p className="subtitle">Memuat pratinjau perhitungan...</p>;
  if (error && !baris) return <div className="alert alert-danger">{error}</div>;

  return (
    <div>
      <div className="table-wrap">
        <table>
          <thead><tr>
            <th></th><th>Personel</th>
            <th>Rate</th><th>Hari Ditagihkan / Acuan</th>
            <th>Nilai Penuh</th><th>Sudah di PO Lain</th><th>Akan Ditagihkan (PO ini)</th>
          </tr></thead>
          <tbody>
            {(baris ?? []).map((b) => {
              const tidakBisaDipilih = !!b.error || b.sudahLunasBulanIni || !b.akanDitagihkan || Number(b.akanDitagihkan) <= 0;
              return (
              <tr key={b.personelId} style={{ opacity: b.error || b.sudahLunasBulanIni ? 0.6 : 1 }}>
                <td>
                  <input type="checkbox" disabled={tidakBisaDipilih} checked={dipilih.has(b.personelId)} onChange={() => toggle(b.personelId)} />
                </td>
                <td>{b.namaPersonel}</td>
                <td>{b.nilaiRateDipakai ? formatRupiah(b.nilaiRateDipakai) : "-"}</td>
                <td>{b.hariKerjaDapatDitagihkan ?? "-"} / {b.hariKerjaAcuanBulan ?? "-"}</td>
                {b.error ? (
                  <td colSpan={3} style={{ color: "var(--color-danger)" }}>{b.error}</td>
                ) : (
                  <>
                    <td>{b.nilaiPenuh ? formatRupiah(b.nilaiPenuh) : "-"}</td>
                    <td>{Number(b.sudahDialokasikanDiPoLain) > 0 ? formatRupiah(b.sudahDialokasikanDiPoLain) : "-"}</td>
                    <td>
                      {b.sudahLunasBulanIni ? (
                        <span className="badge">Sudah lunas di PO lain</span>
                      ) : b.akanDitagihkan && Number(b.akanDitagihkan) > 0 ? (
                        formatRupiah(b.akanDitagihkan)
                      ) : (
                        <span style={{ color: "var(--color-danger)" }}>Saldo PO ini habis</span>
                      )}
                    </td>
                  </>
                )}
              </tr>
              );
            })}
            {(baris ?? []).length === 0 && <tr><td colSpan={7} className="table-empty">Tidak ada personel terpetakan ke PO ini untuk periode tersebut.</td></tr>}
          </tbody>
        </table>
      </div>
      <p className="card" style={{ display: "inline-block", padding: "10px 16px", fontSize: 15 }}>
        Total dipilih: <b>{formatRupiah(String(total))}</b>
      </p>
      {error && <div className="alert alert-danger">{error}</div>}
      <div>
        <button onClick={simpan} disabled={loadingSimpan || dipilih.size === 0} className="btn btn-primary">
          {loadingSimpan ? "Menyimpan..." : "Simpan Revisi"}
        </button>
        <p className="subtitle" style={{ marginTop: 8 }}>
          Setelah disimpan, Anda masih perlu menekan <b>&quot;Konfirmasi Pengajuan Ini&quot;</b> di halaman detail supaya masuk lagi ke antrean Checker.
        </p>
      </div>
    </div>
  );
}
