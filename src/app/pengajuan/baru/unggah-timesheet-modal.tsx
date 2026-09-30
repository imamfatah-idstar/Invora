"use client";

import { useState } from "react";

export default function UnggahTimesheetModal({
  personelId, namaPersonel, poId, userXlId, periode, sudahAda, onSelesai, onTutup,
}: {
  personelId: number; namaPersonel: string; poId: number | string; userXlId: number | string;
  periode: string; sudahAda: boolean; onSelesai: () => void; onTutup: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [totalHariKerja, setTotalHariKerja] = useState("");
  const [totalKehadiran, setTotalKehadiran] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function simpan() {
    setError(null);
    if (!file) { setError("Pilih file timesheet dulu."); return; }
    if (totalHariKerja === "" || totalKehadiran === "") { setError("Total hari kerja dan total kehadiran wajib diisi."); return; }

    const fd = new FormData();
    fd.append("personelId", String(personelId));
    fd.append("poId", String(poId));
    fd.append("userXlId", String(userXlId));
    fd.append("periode", periode);
    fd.append("totalHariKerja", totalHariKerja);
    fd.append("totalKehadiran", totalKehadiran);
    fd.append("file", file);

    setLoading(true);
    const res = await fetch("/api/timesheet", { method: "POST", body: fd });
    setLoading(false);
    if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error ?? "Gagal mengunggah timesheet."); return; }
    onSelesai();
  }

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50,
    }}>
      <div className="card" style={{ width: 420, maxWidth: "90vw" }}>
        <h3 style={{ marginTop: 0 }}>Upload Timesheet — {namaPersonel}</h3>
        <p style={{ fontSize: 13, opacity: 0.75 }}>Periode {periode}. {sudahAda ? "Sudah ada timesheet untuk periode ini — mengunggah lagi akan menimpa data sebelumnya." : "Belum ada timesheet untuk periode ini."}</p>

        <div className="field">
          <label>File Timesheet (PDF/Excel/CSV)</label>
          <input type="file" accept=".pdf,.xlsx,.xls,.csv" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </div>
        <div className="field">
          <label>Total Hari Kerja</label>
          <input type="number" min={0} value={totalHariKerja} onChange={(e) => setTotalHariKerja(e.target.value)} />
        </div>
        <div className="field">
          <label>Total Kehadiran</label>
          <input type="number" min={0} value={totalKehadiran} onChange={(e) => setTotalKehadiran(e.target.value)} />
        </div>

        {error && <div className="alert alert-danger">{error}</div>}

        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <button className="btn btn-primary" onClick={simpan} disabled={loading}>{loading ? "Mengunggah..." : "Simpan"}</button>
          <button className="btn-text" onClick={onTutup} disabled={loading}>Batal</button>
        </div>
      </div>
    </div>
  );
}
