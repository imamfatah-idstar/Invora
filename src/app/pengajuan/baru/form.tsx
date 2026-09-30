"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import UnggahTimesheetModal from "./unggah-timesheet-modal";
import ComboSelect from "@/components/combo-select";

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

  async function hitungPratinjau() {
    setError(null);
    if (!periode) { setError("Pilih periode dulu."); return; }
    setLoadingHitung(true);
    const res = await fetch("/api/pengajuan/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ poId, periode }),
    });
    setLoadingHitung(false);
    if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error ?? "Gagal menghitung."); return; }
    const data = await res.json();
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
        approvalAlokasiUserXlPemberi: approvalPemberi || undefined,
        approvalAlokasiTanggal: approvalTanggal || undefined,
        approvalAlokasiReferensi: approvalReferensi || undefined,
      }),
    });
    setLoadingSimpan(false);
    if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error ?? "Gagal menyimpan."); return; }
    const data = await res.json();
    router.push(`/pengajuan/${data.id}`);
  }

  const total = (baris ?? [])
    .filter((b) => dipilih.has(b.personelId) && b.akanDitagihkan)
    .reduce((acc, b) => acc + Number(b.akanDitagihkan), 0);

  if (daftarPo.length === 0 || daftarUserXl.length === 0) {
    return <div className="alert alert-danger">Perlu minimal 1 PO dan 1 User XL (buat dulu di menu Data Referensi).</div>;
  }

  return (
    <div>
      <div className="toolbar">
        <div className="field" style={{ minWidth: 280 }}>
          <label>PO</label>
          <ComboSelect
            value={poId}
            onChange={(v) => { setPoId(Number(v)); setBaris(null); }}
            opsi={daftarPo.map((p) => ({ value: p.id, label: p.label }))}
            placeholderCari="Cari nomor PO atau nama proyek..."
          />
        </div>
        <div className="field">
          <label>User XL</label>
          <select value={userXlId} onChange={(e) => setUserXlId(Number(e.target.value))}>
            {daftarUserXl.map((u) => <option key={u.id} value={u.id}>{u.label}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Periode</label>
          <input type="month" value={periode} onChange={(e) => { setPeriode(e.target.value); setBaris(null); }} />
        </div>
        <button onClick={hitungPratinjau} disabled={loadingHitung} className="btn btn-primary">{loadingHitung ? "Menghitung..." : "Hitung Pratinjau"}</button>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {baris && (
        <>
          <div className="table-wrap">
            <table>
              <thead><tr>
                <th></th><th>Personel</th>
                <th>Rate</th><th>Hari Ditagihkan / Acuan</th>
                <th>Sumber</th>
                <th>Nilai Penuh</th>
                <th>Sudah di PO Lain</th>
                <th>Akan Ditagihkan (PO ini)</th>
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
                        {b.sumberHitung === "timesheet" ? "Timesheet" : "Kalender"}
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
                            <span className="badge">Sudah lunas di PO lain</span>
                          ) : b.akanDitagihkan && Number(b.akanDitagihkan) > 0 ? (
                            <>
                              {formatRupiah(b.akanDitagihkan)}
                              {b.sisaPerluDitagih && Number(b.sisaPerluDitagih) > Number(b.akanDitagihkan) && (
                                <div style={{ fontSize: 12, color: "var(--color-warning, #b45309)" }}>
                                  Sisa {formatRupiah(String(Number(b.sisaPerluDitagih) - Number(b.akanDitagihkan)))} belum tertagih — perlu pengajuan tambahan di PO lain.
                                </div>
                              )}
                            </>
                          ) : (
                            <span style={{ color: "var(--color-danger)" }}>Saldo PO ini habis</span>
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
                        {b.sumberHitung === "timesheet" ? "Ganti Timesheet" : "Upload Timesheet"}
                      </button>
                    </td>
                  </tr>
                  );
                })}
                {baris.length === 0 && <tr><td colSpan={9} className="table-empty">Tidak ada personel terpetakan ke PO ini untuk periode tersebut.</td></tr>}
              </tbody>
            </table>
          </div>
          <p className="card" style={{ display: "inline-block", padding: "10px 16px", fontSize: 15 }}>
            Total dipilih: <b>{formatRupiah(String(total))}</b>
          </p>
          {baris.some((b) => Number(b.sudahDialokasikanDiPoLain) > 0) && (
            <div className="card" style={{ padding: "12px 16px", marginTop: 8 }}>
              <p style={{ marginTop: 0, fontSize: 13, color: "var(--color-muted, #666)" }}>
                Ada personel yang tagihannya dipecah lintas PO bulan ini. Approval User XL untuk pemecahan ini
                terjadi di luar Invora (email/WhatsApp) — kolom di bawah opsional, hanya untuk catatan internal.
              </p>
              <div className="toolbar">
                <div className="field">
                  <label>Disetujui oleh (User XL)</label>
                  <input value={approvalPemberi} onChange={(e) => setApprovalPemberi(e.target.value)} placeholder="Nama User XL" />
                </div>
                <div className="field">
                  <label>Tanggal approval</label>
                  <input type="date" value={approvalTanggal} onChange={(e) => setApprovalTanggal(e.target.value)} />
                </div>
                <div className="field">
                  <label>Referensi (link/subjek email/WA)</label>
                  <input value={approvalReferensi} onChange={(e) => setApprovalReferensi(e.target.value)} placeholder="cth. subjek email atau link chat" />
                </div>
              </div>
            </div>
          )}
          <div>
            <button onClick={simpan} disabled={loadingSimpan || dipilih.size === 0} className="btn btn-primary">
              {loadingSimpan ? "Menyimpan..." : "Simpan sebagai Draft"}
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
