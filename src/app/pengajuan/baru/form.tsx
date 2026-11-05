"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import UnggahTimesheetModal from "./unggah-timesheet-modal";
import ComboSelect from "@/components/combo-select";
import InputTagihanTahap, { BarisTahapUi, nilaiManualTerisi, totalNilaiTahap } from "@/components/input-tagihan-tahap";

type Opsi = { id: number; label: string };
type BarisHitung = {
  personelId: number; namaPersonel: string;
  nilaiRateDipakai: string | null; hariKerjaDapatDitagihkan: number | null;
  hariKerjaAcuanBulan: number | null; hasilHitung: string | null; error: string | null;
  sumberHitung: "timesheet" | "kalender";
  // Hasil alokasi lintas-PO (bagian 35) — dari terapkanAlokasiLintasPo di server.
  nilaiPenuh: string | null;
  sudahDialokasikanDiPoLain: string;
  sisaPerluDitagih: string | null;
  akanDitagihkan: string | null;
  sudahLunasBulanIni: boolean;
};

function formatRupiah(nilai: string) {
  return "Rp" + Number(nilai).toLocaleString("id-ID", { minimumFractionDigits: 2 });
}

export default function FormBuatPengajuan({ daftarPo, daftarUserXl }: { daftarPo: Opsi[]; daftarUserXl: Opsi[] }) {
  const router = useRouter();
  const [poId, setPoId] = useState(daftarPo[0]?.id ?? "");
  const [userXlId, setUserXlId] = useState(daftarUserXl[0]?.id ?? "");
  const [periode, setPeriode] = useState("");
  const [baris, setBaris] = useState<BarisHitung[] | null>(null);
  const [dipilih, setDipilih] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [loadingHitung, setLoadingHitung] = useState(false);
  const [loadingSimpan, setLoadingSimpan] = useState(false);
  const [modalPersonel, setModalPersonel] = useState<{ id: number; nama: string; sudahAda: boolean } | null>(null);
  const [approvalPemberi, setApprovalPemberi] = useState("");
  const [approvalTanggal, setApprovalTanggal] = useState("");
  const [approvalReferensi, setApprovalReferensi] = useState("");
  // PO tagihan "tahap" (bagian 53): nilai manual per personel + keterangan tahap.
  const [jenis, setJenis] = useState<"bulanan" | "tahap">("bulanan");
  const [barisTahap, setBarisTahap] = useState<BarisTahapUi[] | null>(null);
  const [nilaiTahap, setNilaiTahap] = useState<Record<number, string>>({});
  const [keteranganTahap, setKeteranganTahap] = useState("");
  // MVP 4: Deficiency GR (selisih) dari pengajuan sebelumnya pada PO yang sama
  const [selisihMenggantung, setSelisihMenggantung] = useState<{
    sumberPengajuanId: number;
    periode: string;
    nomorInvoice: string | null;
    nominal: string;
    isKekurangan: boolean;
  } | null>(null);

  async function hitungPratinjau() {
    setError(null);
    if (!periode) { setError("Please select a billing period first."); return; }
    setLoadingHitung(true);
    const res = await fetch("/api/pengajuan/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ poId, periode }),
    });
    setLoadingHitung(false);
    if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error ?? "Failed to calculate."); return; }
    const data = await res.json();
    setSelisihMenggantung(data.selisihMenggantung ?? null);
    if (data.jenis === "tahap") {
      setJenis("tahap");
      setBarisTahap(data.baris);
      setBaris(null);
      return;
    }
    setJenis("bulanan");
    setBarisTahap(null);
    setBaris(data.baris);
    setDipilih(new Set(
      data.baris
        .filter((b: BarisHitung) => !b.error && !b.sudahLunasBulanIni && b.akanDitagihkan && Number(b.akanDitagihkan) > 0)
        .map((b: BarisHitung) => b.personelId)
    ));
  }

  function toggle(id: number) {
    setDipilih((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function simpan() {
    setError(null); setLoadingSimpan(true);
    const res = await fetch("/api/pengajuan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        poId, userXlId, periode, personelIds: Array.from(dipilih),
        ...(jenis === "tahap" ? { nilaiManual: nilaiManualTerisi(nilaiTahap), keteranganTahap } : {}),
        approvalAlokasiUserXlPemberi: approvalPemberi || undefined,
        approvalAlokasiTanggal: approvalTanggal || undefined,
        approvalAlokasiReferensi: approvalReferensi || undefined,
      }),
    });
    setLoadingSimpan(false);
    if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error ?? "Failed to save."); return; }
    const data = await res.json();
    router.push(`/pengajuan/${data.id}`);
  }

  const total = (baris ?? [])
    .filter((b) => dipilih.has(b.personelId) && b.akanDitagihkan)
    .reduce((acc, b) => acc + Number(b.akanDitagihkan), 0);

  if (daftarPo.length === 0 || daftarUserXl.length === 0) {
    return <div className="alert alert-danger">At least 1 PO and 1 Client Approver are required (create them first in Reference Data).</div>;
  }

  return (
    <div>
      <div className="toolbar">
        <div className="field" style={{ minWidth: 280 }}>
          <label>PO</label>
          <ComboSelect
            value={poId}
            onChange={(v) => { setPoId(Number(v)); setBaris(null); setBarisTahap(null); }}
            opsi={daftarPo.map((p) => ({ value: p.id, label: p.label }))}
            placeholderCari="Search PO number or project name..."
          />
        </div>
        <div className="field">
          <label>Client Approver (User XL)</label>
          <select value={userXlId} onChange={(e) => setUserXlId(Number(e.target.value))}>
            {daftarUserXl.map((u) => <option key={u.id} value={u.id}>{u.label}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Billing Period</label>
          <input type="month" value={periode} onChange={(e) => { setPeriode(e.target.value); setBaris(null); setBarisTahap(null); }} />
        </div>
        <button onClick={hitungPratinjau} disabled={loadingHitung} className="btn btn-primary">{loadingHitung ? "Calculating..." : "Calculate Preview"}</button>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {jenis === "tahap" && barisTahap && (
        <>
          <InputTagihanTahap
            baris={barisTahap}
            nilai={nilaiTahap}
            onNilai={(id, v) => setNilaiTahap((prev) => ({ ...prev, [id]: v }))}
            keterangan={keteranganTahap}
            onKeterangan={setKeteranganTahap}
          />
          <div>
            <button
              onClick={simpan}
              disabled={loadingSimpan || totalNilaiTahap(nilaiTahap) <= 0 || !keteranganTahap.trim()}
              className="btn btn-primary"
            >
              {loadingSimpan ? "Saving..." : "Save as Draft"}
            </button>
          </div>
        </>
      )}

      {jenis === "bulanan" && baris && (
        <>
          <div className="table-wrap">
            <table>
              <thead><tr>
                <th></th><th>Personnel</th>
                <th>Rate</th><th>Billable / Reference Days</th>
                <th>Source</th>
                <th>Full Amount</th>
                <th>Allocated to Other PO</th>
                <th>Billed to This PO</th>
                <th>Timesheet</th>
              </tr></thead>
              <tbody>
                {baris.map((b) => {
                  const tidakBisaDipilih = !!b.error || b.sudahLunasBulanIni || !b.akanDitagihkan || Number(b.akanDitagihkan) <= 0;
                  return (
                  <tr key={b.personelId} style={{ opacity: b.error || b.sudahLunasBulanIni ? 0.6 : 1 }}>
                    <td>
                      <input type="checkbox" disabled={tidakBisaDipilih} checked={dipilih.has(b.personelId)} onChange={() => toggle(b.personelId)} />
                    </td>
                    <td>{b.namaPersonel}</td>
                    <td>{b.nilaiRateDipakai ? formatRupiah(b.nilaiRateDipakai) : "-"}</td>
                    <td>{b.hariKerjaDapatDitagihkan ?? "-"} / {b.hariKerjaAcuanBulan ?? "-"}</td>
                    <td>
                      <span className={`badge ${b.sumberHitung === "timesheet" ? "badge-siap_diajukan" : ""}`}>
                        {b.sumberHitung === "timesheet" ? "Timesheet" : "Working Calendar"}
                      </span>
                    </td>
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
                            <>
                              {formatRupiah(b.akanDitagihkan)}
                              {b.sisaPerluDitagih && Number(b.sisaPerluDitagih) > Number(b.akanDitagihkan) && (
                                <div style={{ fontSize: 12, color: "var(--color-warning, #b45309)" }}>
                                  Remaining {formatRupiah(String(Number(b.sisaPerluDitagih) - Number(b.akanDitagihkan)))} unbilled — requires additional submission on another PO.
                                </div>
                              )}
                            </>
                          ) : (
                            <span style={{ color: "var(--color-danger)" }}>Remaining PO balance exhausted</span>
                          )}
                        </td>
                      </>
                    )}
                    <td>
                      <button
                        type="button"
                        className="btn-text"
                        onClick={() => setModalPersonel({ id: b.personelId, nama: b.namaPersonel, sudahAda: b.sumberHitung === "timesheet" })}
                        disabled={!periode}
                      >
                        {b.sumberHitung === "timesheet" ? "Change Timesheet" : "Upload Timesheet"}
                      </button>
                    </td>
                  </tr>
                  );
                })}
                {baris.length === 0 && <tr><td colSpan={9} className="table-empty">No personnel mapped to this PO for the selected period.</td></tr>}
              </tbody>
            </table>
          </div>
          {selisihMenggantung && (
            <div
              className="card"
              style={{
                marginTop: 12,
                padding: "12px 16px",
                borderLeft: selisihMenggantung.isKekurangan ? "4px solid #f59e0b" : "4px solid #3b82f6",
                background: "var(--color-bg-alt, #f8fafc)",
              }}
            >
              <h4 style={{ margin: "0 0 4px 0", fontSize: 14 }}>
                ⚠️ Deficiency GR Carry-Over Detected (One-Time Carry-Over)
              </h4>
              <p style={{ margin: "0 0 8px 0", fontSize: 13, color: "var(--color-text-muted)" }}>
                A GR variance was found from previous submission (Period: <b>{selisihMenggantung.periode}</b>, {selisihMenggantung.nomorInvoice ? `Invoice No: ${selisihMenggantung.nomorInvoice}` : `Ref: Submission #${selisihMenggantung.sumberPengajuanId}`}).
                This amount will be automatically absorbed into this submission as a billing adjustment.
              </p>
              <div style={{ display: "flex", gap: 16, fontSize: 13, flexWrap: "wrap" }}>
                <span>Personnel Subtotal: <b>{formatRupiah(String(total))}</b></span>
                <span>
                  GR Variance Adjustment:{" "}
                  <b style={{ color: selisihMenggantung.isKekurangan ? "#b45309" : "#1d4ed8" }}>
                    {selisihMenggantung.isKekurangan ? "+" : ""}{formatRupiah(selisihMenggantung.nominal)} ({selisihMenggantung.isKekurangan ? "Adds to Billing" : "Deducts from Billing"})
                  </b>
                </span>
                <span style={{ fontSize: 14, fontWeight: "bold" }}>
                  Estimated Final Amount: {formatRupiah(String(total + Number(selisihMenggantung.nominal)))}
                </span>
              </div>
            </div>
          )}

          <p className="card" style={{ display: "inline-block", padding: "10px 16px", fontSize: 15, marginTop: 12 }}>
            Selected Total: <b>{formatRupiah(String(total))}</b>
            {selisihMenggantung && (
              <span style={{ fontSize: 13, color: "var(--color-text-muted)", marginLeft: 8 }}>
                (before GR variance adjustment {selisihMenggantung.isKekurangan ? "+" : ""}{formatRupiah(selisihMenggantung.nominal)})
              </span>
            )}
          </p>
          {baris.some((b) => Number(b.sudahDialokasikanDiPoLain) > 0) && (
            <div className="card" style={{ padding: "12px 16px", marginTop: 8 }}>
              <p style={{ marginTop: 0, fontSize: 13, color: "var(--color-muted, #666)" }}>
                Some personnel billings are split across POs this month. Approval from Client Approver for this split
                is arranged offline (email/WhatsApp) — fields below are optional for internal audit trail.
              </p>
              <div className="toolbar">
                <div className="field">
                  <label>Approved by (Client Approver)</label>
                  <input value={approvalPemberi} onChange={(e) => setApprovalPemberi(e.target.value)} placeholder="Approver Name" />
                </div>
                <div className="field">
                  <label>Approval Date</label>
                  <input type="date" value={approvalTanggal} onChange={(e) => setApprovalTanggal(e.target.value)} />
                </div>
                <div className="field">
                  <label>Reference (email subject / message link)</label>
                  <input value={approvalReferensi} onChange={(e) => setApprovalReferensi(e.target.value)} placeholder="e.g. email subject or chat link" />
                </div>
              </div>
            </div>
          )}
          <div>
            <button onClick={simpan} disabled={loadingSimpan || dipilih.size === 0} className="btn btn-primary">
              {loadingSimpan ? "Saving..." : "Save as Draft"}
            </button>
          </div>
        </>
      )}

      {modalPersonel && (
        <UnggahTimesheetModal
          personelId={modalPersonel.id}
          namaPersonel={modalPersonel.nama}
          poId={poId}
          userXlId={userXlId}
          periode={periode}
          sudahAda={modalPersonel.sudahAda}
          onTutup={() => setModalPersonel(null)}
          onSelesai={() => { setModalPersonel(null); hitungPratinjau(); }}
        />
      )}
    </div>
  );
}
