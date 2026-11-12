"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type HasilImporCsv = {
  totalBarisFile: number;
  totalDiproses: number;
  personelBaru: number;
  personelDiperbarui: number;
  rateDiperbarui: number;
  poBaru: number;
  klienPoDiisi: number;
  userBaru: number;
  pemetaanDibuat: number;
  pemetaanDiperbarui: number;
  tidakBerubah: number;
  dilewati: number;
  catatanDilewati: string[];
};

const CONTOH_CSV = `NIK,name,client_name,Type,position,status_code,placement_name,spk_start_date,spk_actual_end_date,rate_card,po_number,spk_number,User
00001,Adhi Nugroho,Bank Digital BCA,PS_IDSTAR,Java Developer,ACTIVE,Bank Digital BCA - Plaza Mutiara,2025-11-12,31/12/2026,26250000,094A/SPK/OMP/12/2025,887/SPK 3 - IDS/XII/2025,Tiara Hapsari
00002,Bertha Lusiana,Bank Digital BCA,PS_IDSTAR,Quality Assurance,ACTIVE,Bank Digital BCA - Gedung Bank Royal,2025-11-12,31/12/2026,23625000,094A/SPK/OMP/12/2025,028/SPK 2 - IDS/XII/2025,Tiara Hapsari`;

export default function FormImporPersonelCsv() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasil, setHasil] = useState<HasilImporCsv | null>(null);

  function unduhTemplateCsv() {
    const blob = new Blob([CONTOH_CSV], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "template-personel-inv.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setHasil(null);
    if (!file) {
      setError("Pilih file CSV terlebih dahulu.");
      return;
    }
    setLoading(true);
    const formData = new FormData();
    formData.set("file", file);
    const res = await fetch("/api/data-referensi/personel/impor-csv", {
      method: "POST",
      body: formData,
    });
    const d = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(d.error ?? "Gagal mengimpor file CSV.");
      return;
    }
    setHasil(d);
    setFile(null);
    (e.target as HTMLFormElement).reset();
    router.refresh();
  }

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h3 style={{ marginTop: 0, marginBottom: 4 }}>Bulk Import Personnel &amp; Mapping (CSV)</h3>
          <p className="subtitle" style={{ fontSize: 13, marginBottom: 8 }}>
            Masukkan seluruh data sekaligus dari file CSV dengan struktur{" "}
            <code>DummyData- Personel_Inv.csv</code>:{" "}
            <code>NIK, name, client_name, Type, position, status_code, placement_name, spk_start_date, spk_actual_end_date, rate_card, po_number, spk_number, User</code>.
            Otomatis mengisi <b>Personnel</b>, <b>Rate Card</b>, <b>PO</b> (jika belum ada),{" "}
            <b>User / Client Approver</b>, serta <b>Personnel &harr; PO Mapping</b> sekaligus.
          </p>
        </div>
        <button type="button" onClick={unduhTemplateCsv} className="btn-text" style={{ whiteSpace: "nowrap" }}>
          &darr; Download Template CSV
        </button>
      </div>

      <form onSubmit={handleSubmit} className="toolbar">
        <div className="field">
          <label>File CSV (Struktur DummyData- Personel_Inv.csv)</label>
          <input
            type="file"
            accept=".csv"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            required
          />
        </div>
        <button type="submit" disabled={loading} className="btn btn-primary">
          {loading ? "Mengimpor..." : "Import CSV Sekaligus"}
        </button>
        {error && <div className="alert alert-danger" style={{ margin: 0 }}>{error}</div>}
      </form>

      {hasil && (
        <div className="alert alert-success" style={{ marginTop: 12 }}>
          Selesai — <b>{hasil.totalDiproses}</b> personel diproses (dari {hasil.totalBarisFile} baris CSV):{" "}
          <b>{hasil.personelBaru}</b> personel baru,{" "}
          <b>{hasil.personelDiperbarui}</b> personel diperbarui,{" "}
          <b>{hasil.rateDiperbarui}</b> rate card disinkronkan,{" "}
          <b>{hasil.poBaru}</b> PO baru dibuat ({hasil.klienPoDiisi} klien PO dilengkapi),{" "}
          <b>{hasil.userBaru}</b> User/Approver baru,{" "}
          <b>{hasil.pemetaanDibuat}</b> pemetaan personel-PO baru ({hasil.pemetaanDiperbarui} diperbarui),{" "}
          {hasil.dilewati} dilewati.
          {hasil.catatanDilewati.length > 0 && (
            <ul style={{ margin: "6px 0 0", paddingLeft: 18, fontSize: 12.5 }}>
              {hasil.catatanDilewati.map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

