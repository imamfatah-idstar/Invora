"use client";

import { useEffect, useState } from "react";

export default function UnggahTimesheetModal({
  personelId, namaPersonel, poId, userXlId, periode, sudahAda, onSelesai, onTutup,
}: {
  personelId: number; namaPersonel: string; poId: number | string; userXlId: number | string;
  periode: string; sudahAda: boolean; onSelesai: () => void; onTutup: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [tanggalTimesheet, setTanggalTimesheet] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [totalHariKerja, setTotalHariKerja] = useState("");
  const [totalKehadiran, setTotalKehadiran] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!personelId || !poId || !periode) return;
    fetch(`/api/timesheet?personelId=${personelId}&poId=${poId}&periode=${encodeURIComponent(periode)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.timesheet) {
          setTotalHariKerja(String(d.timesheet.totalHariKerja));
          setTotalKehadiran(String(d.timesheet.totalKehadiran));
          if (d.timesheet.tanggalTimesheet) setTanggalTimesheet(d.timesheet.tanggalTimesheet);
        }
      })
      .catch(() => {});
  }, [personelId, poId, periode]);

  async function simpan() {
    setError(null);
    if (totalHariKerja === "" || totalKehadiran === "") {
      setError("Total working days and total attendance days are required.");
      return;
    }

    const fd = new FormData();
    fd.append("personelId", String(personelId));
    fd.append("poId", String(poId));
    fd.append("userXlId", String(userXlId));
    fd.append("periode", periode);
    fd.append("tanggalTimesheet", tanggalTimesheet);
    fd.append("totalHariKerja", totalHariKerja);
    fd.append("totalKehadiran", totalKehadiran);
    if (file) {
      fd.append("file", file);
    }

    setLoading(true);
    const res = await fetch("/api/timesheet", { method: "POST", body: fd });
    setLoading(false);
    if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error ?? "Failed to save timesheet."); return; }
    onSelesai();
  }

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50,
    }}>
      <div className="card" style={{ width: 420, maxWidth: "90vw" }}>
        <h3 style={{ marginTop: 0 }}>Input / Upload Timesheet — {namaPersonel}</h3>
        <p style={{ fontSize: 13, opacity: 0.75 }}>Billing Period {periode}. {sudahAda ? "A timesheet already exists for this period — saving will update the existing data." : "No timesheet recorded for this period yet."}</p>

        <div className="field">
          <label>Timesheet Document Date (Tanggal Timesheet)</label>
          <input
            type="date"
            value={tanggalTimesheet}
            onChange={(e) => setTanggalTimesheet(e.target.value)}
            required
          />
        </div>
        <div className="field">
          <label>Total Working Days (Workdays Timesheet)</label>
          <input type="number" min={1} value={totalHariKerja} onChange={(e) => setTotalHariKerja(e.target.value)} required />
        </div>
        <div className="field">
          <label>Total Attendance Days (Kehadiran)</label>
          <input type="number" min={0} value={totalKehadiran} onChange={(e) => setTotalKehadiran(e.target.value)} required />
        </div>
        <div className="field">
          <label>Timesheet File (PDF/Excel/CSV — Optional)</label>
          <input type="file" accept=".pdf,.xlsx,.xls,.csv" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </div>

        {error && <div className="alert alert-danger">{error}</div>}

        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <button className="btn btn-primary" onClick={simpan} disabled={loading}>{loading ? "Saving..." : "Save & Recalculate"}</button>
          <button className="btn-text" onClick={onTutup} disabled={loading}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
