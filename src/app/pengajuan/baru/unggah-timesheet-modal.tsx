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
    if (!file) { setError("Please select a timesheet file first."); return; }
    if (totalHariKerja === "" || totalKehadiran === "") { setError("Total working days and total attendance days are required."); return; }

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
    if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error ?? "Failed to upload timesheet."); return; }
    onSelesai();
  }

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50,
    }}>
      <div className="card" style={{ width: 420, maxWidth: "90vw" }}>
        <h3 style={{ marginTop: 0 }}>Upload Timesheet — {namaPersonel}</h3>
        <p style={{ fontSize: 13, opacity: 0.75 }}>Billing Period {periode}. {sudahAda ? "A timesheet already exists for this period — uploading a new file will overwrite existing data." : "No timesheet recorded for this period yet."}</p>

        <div className="field">
          <label>Timesheet File (PDF/Excel/CSV)</label>
          <input type="file" accept=".pdf,.xlsx,.xls,.csv" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </div>
        <div className="field">
          <label>Total Working Days</label>
          <input type="number" min={0} value={totalHariKerja} onChange={(e) => setTotalHariKerja(e.target.value)} />
        </div>
        <div className="field">
          <label>Total Attendance Days</label>
          <input type="number" min={0} value={totalKehadiran} onChange={(e) => setTotalKehadiran(e.target.value)} />
        </div>

        {error && <div className="alert alert-danger">{error}</div>}

        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <button className="btn btn-primary" onClick={simpan} disabled={loading}>{loading ? "Uploading..." : "Save"}</button>
          <button className="btn-text" onClick={onTutup} disabled={loading}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
