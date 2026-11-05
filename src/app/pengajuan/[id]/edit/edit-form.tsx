"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import InputTagihanTahap, { BarisTahapUi, nilaiManualTerisi, totalNilaiTahap } from "@/components/input-tagihan-tahap";

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
  pengajuanId, poId, periode, personelIdsAwal, jenisTagihan, keteranganTahapAwal, nilaiTahapAwal,
}: {
  pengajuanId: number; poId: number; periode: string; personelIdsAwal: number[];
  jenisTagihan: string; keteranganTahapAwal: string; nilaiTahapAwal: Record<number, string>;
}) {
  const router = useRouter();
  const [baris, setBaris] = useState<BarisHitung[] | null>(null);
  const [dipilih, setDipilih] = useState<Set<number>>(new Set(personelIdsAwal));
  const [error, setError] = useState<string | null>(null);
  const [loadingHitung, setLoadingHitung] = useState(true);
  const [loadingSimpan, setLoadingSimpan] = useState(false);
  const modeTahap = jenisTagihan === "tahap";
  const [barisTahap, setBarisTahap] = useState<BarisTahapUi[] | null>(null);
  const [nilaiTahap, setNilaiTahap] = useState<Record<number, string>>(nilaiTahapAwal);
  const [keteranganTahap, setKeteranganTahap] = useState(keteranganTahapAwal);

  useEffect(() => {
    (async () => {
      setLoadingHitung(true);
      const res = await fetch("/api/pengajuan/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ poId, periode }),
      });
      setLoadingHitung(false);
      if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error ?? "Failed to load preview."); return; }
      const data = await res.json();
      if (data.jenis === "tahap") { setBarisTahap(data.baris); return; }
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
      body: JSON.stringify(
        modeTahap
          ? { personelIds: [], nilaiManual: nilaiManualTerisi(nilaiTahap), keteranganTahap }
          : { personelIds: Array.from(dipilih) }
      ),
    });
    setLoadingSimpan(false);
    if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error ?? "Failed to save."); return; }
    router.push(`/pengajuan/${pengajuanId}`);
    router.refresh();
  }

  const total = (baris ?? [])
    .filter((b) => dipilih.has(b.personelId) && b.akanDitagihkan)
    .reduce((acc, b) => acc + Number(b.akanDitagihkan), 0);

  if (loadingHitung) return <p className="subtitle">Loading calculation preview...</p>;
  if (error && !baris && !barisTahap) return <div className="alert alert-danger">{error}</div>;

  if (modeTahap && barisTahap) {
    return (
      <div>
        <InputTagihanTahap
          baris={barisTahap}
          nilai={nilaiTahap}
          onNilai={(id, v) => setNilaiTahap((prev) => ({ ...prev, [id]: v }))}
          keterangan={keteranganTahap}
          onKeterangan={setKeteranganTahap}
        />
        {error && <div className="alert alert-danger">{error}</div>}
        <div>
          <button
            onClick={simpan}
            disabled={loadingSimpan || totalNilaiTahap(nilaiTahap) <= 0 || !keteranganTahap.trim()}
            className="btn btn-primary"
          >
            {loadingSimpan ? "Saving..." : "Save Revisions"}
          </button>
          <p className="subtitle" style={{ marginTop: 8 }}>
            After saving, you still need to click <b>&quot;Confirm &amp; Submit to Checker&quot;</b> on the details page to return it to the Checker queue.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="table-wrap">
        <table>
          <thead><tr>
            <th></th><th>Personnel</th>
            <th>Rate</th><th>Billable / Reference Days</th>
            <th>Full Amount</th><th>Allocated to Other PO</th><th>Billed to This PO</th>
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
                        <span className="badge">Fully billed on other PO</span>
                      ) : b.akanDitagihkan && Number(b.akanDitagihkan) > 0 ? (
                        formatRupiah(b.akanDitagihkan)
                      ) : (
                        <span style={{ color: "var(--color-danger)" }}>Remaining PO balance exhausted</span>
                      )}
                    </td>
                  </>
                )}
              </tr>
              );
            })}
            {(baris ?? []).length === 0 && <tr><td colSpan={7} className="table-empty">No personnel mapped to this PO for the selected period.</td></tr>}
          </tbody>
        </table>
      </div>
      <p className="card" style={{ display: "inline-block", padding: "10px 16px", fontSize: 15 }}>
        Selected Total: <b>{formatRupiah(String(total))}</b>
      </p>
      {error && <div className="alert alert-danger">{error}</div>}
      <div>
        <button onClick={simpan} disabled={loadingSimpan || dipilih.size === 0} className="btn btn-primary">
          {loadingSimpan ? "Saving..." : "Save Revisions"}
        </button>
        <p className="subtitle" style={{ marginTop: 8 }}>
          After saving, you still need to click <b>&quot;Confirm &amp; Submit to Checker&quot;</b> on the details page to return it to the Checker queue.
        </p>
      </div>
    </div>
  );
}
