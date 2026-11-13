"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type DataGrRequest = {
  namaFileGenerate: string | null;
  digeneratePada: string | null;
  namaFileBalikanXl: string | null;
  diunggahBalikanPada: string | null;
  namaDiunggahBalikanOleh: string | null;
  namaFileGabungan: string | null;
  digabungPada: string | null;
  dicekPada: string | null;
  namaDicekOleh: string | null;
  catatanCek: string | null;
} | null;

type BarisRiwayat = {
  id: number;
  langkah: string;
  namaFile: string | null;
  waktu: string;
  namaUser: string | null;
  catatan: string | null;
};

const LABEL_LANGKAH: Record<string, string> = {
  generate: "Generate Vendor sheet",
  balikan: "Upload client return file",
  gabung: "Auto-merge sheets",
  cek: "Confirm verification",
};

function formatTanggalJam(iso: string | null) {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}

export default function GrRequestPanel({
  pengajuanId, data, role, riwayat,
}: { pengajuanId: number; data: DataGrRequest; role: string; riwayat: BarisRiwayat[] }) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [catatan, setCatatan] = useState("");
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [peringatan, setPeringatan] = useState<string[]>([]);

  async function unduhGenerate() {
    setError(null); setLoading("generate");
    const res = await fetch(`/api/pengajuan/${pengajuanId}/gr-request`);
    if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error ?? "Failed to generate."); setLoading(null); return; }
    const p = res.headers.get("X-Peringatan");
    setPeringatan(p ? JSON.parse(decodeURIComponent(p)) : []);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = res.headers.get("Content-Disposition")?.split("filename=")[1]?.replace(/"/g, "") ?? "GR_Request.xlsx";
    a.click();
    URL.revokeObjectURL(url);
    setLoading(null);
    router.refresh();
  }

  async function unggahBalikan(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!file) { setError("Please select a file first."); return; }
    setLoading("balikan");
    const formData = new FormData();
    formData.set("file", file);
    const res = await fetch(`/api/pengajuan/${pengajuanId}/gr-request/balikan`, { method: "POST", body: formData });
    setLoading(null);
    if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error ?? "Failed to upload."); return; }
    setFile(null);
    (e.target as HTMLFormElement).reset();
    router.refresh();
  }

  async function gabungkan() {
    setError(null); setLoading("gabung");
    const res = await fetch(`/api/pengajuan/${pengajuanId}/gr-request/gabung`, { method: "POST" });
    const d = await res.json().catch(() => ({}));
    setLoading(null);
    if (!res.ok) { setError(d.error ?? "Failed to merge."); return; }
    setPeringatan(d.peringatan ?? []);
    router.refresh();
  }

  async function tandaiDicek() {
    setError(null); setLoading("cek");
    const res = await fetch(`/api/pengajuan/${pengajuanId}/gr-request/cek`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ catatan }),
    });
    setLoading(null);
    if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error ?? "Failed to mark as verified."); return; }
    setCatatan("");
    router.refresh();
  }

  return (
    <div className="card" style={{ marginTop: 20 }}>
      <h3 style={{ marginTop: 0 }}>GR Request (Excel) — for Get Approve Portal</h3>
      <p className="subtitle">
        Workflow: (1) Generate Vendor sheet &rarr; (2) Send to client team, client completes SOW &amp; COVER sheets &rarr;
        (3) Upload client return file here and auto-merge &rarr; (4) Checker confirms verification.
      </p>

      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 16 }}>
        <a
          href="https://www.getapprove.xlsmart.co.id/auth/login?nexturl=%252Fapproval-document%2523id%253Dcc5582a1-9e20-4926-865d-9e7d9c65b73c"
          target="_blank"
          rel="noopener noreferrer"
          className="btn"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            backgroundColor: "#002d72",
            borderColor: "#002d72",
            color: "#ffffff",
            fontWeight: 600,
            textDecoration: "none",
          }}
          title="Redirect to official XL Get Approve Portal"
        >
          <span>🚀 Redirect to official XL Get Approve Portal</span>
          <span style={{ fontSize: 12 }}>↗</span>
        </a>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      {peringatan.length > 0 && (
        <div className="alert alert-danger">
          {peringatan.map((p, i) => <div key={i}>&bull; {p}</div>)}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <p style={{ margin: "0 0 6px" }}>
            <b>Step 1 — Generate Vendor sheet</b>{" "}
            {data?.namaFileGenerate && <span className="subtitle">— latest: {data.namaFileGenerate} ({formatTanggalJam(data.digeneratePada)})</span>}
          </p>
          <button type="button" className="btn btn-primary" disabled={loading !== null} onClick={unduhGenerate}>
            {loading === "generate" ? "Generating..." : "Generate & Download"}
          </button>
        </div>

        <div>
          <p style={{ margin: "0 0 6px" }}>
            <b>Step 2 — Upload return file from client</b> (SOW &amp; COVER sheets filled){" "}
            {data?.namaFileBalikanXl && (
              <span className="subtitle">— latest: {data.namaFileBalikanXl} ({formatTanggalJam(data.diunggahBalikanPada)}{data.namaDiunggahBalikanOleh ? `, by ${data.namaDiunggahBalikanOleh}` : ""})</span>
            )}
          </p>
          <form onSubmit={unggahBalikan} className="toolbar">
            <div className="field">
              <input type="file" accept=".xlsx" onChange={(e) => setFile(e.target.files?.[0] ?? null)} required />
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading !== null}>
              {loading === "balikan" ? "Uploading..." : data?.namaFileBalikanXl ? "Replace File" : "Upload"}
            </button>
          </form>
        </div>

        <div>
          <p style={{ margin: "0 0 6px" }}>
            <b>Step 3 — Auto-merge sheets</b>{" "}
            {data?.namaFileGabungan && (
              <span className="subtitle">— latest: {data.namaFileGabungan} ({formatTanggalJam(data.digabungPada)})</span>
            )}
          </p>
          <button type="button" className="btn btn-primary" disabled={loading !== null || !data?.namaFileBalikanXl} onClick={gabungkan}>
            {loading === "gabung" ? "Merging..." : "Auto-merge"}
          </button>
          {data?.namaFileGabungan && (
            <a href={`/api/pengajuan/${pengajuanId}/gr-request/file/gabungan`} className="btn-text" style={{ marginLeft: 10 }}>
              Download merged file
            </a>
          )}
        </div>

        <div>
          <p style={{ margin: "0 0 6px" }}><b>Step 4 — Checker verification confirmation</b></p>
          {data?.dicekPada ? (
            <p style={{ margin: 0, color: "var(--color-success, #1a7f37)" }}>
              &#10003; Verified by <b>{data.namaDicekOleh}</b> on {formatTanggalJam(data.dicekPada)}
              {data.catatanCek && <><br /><span className="subtitle">Notes: {data.catatanCek}</span></>}
            </p>
          ) : (
            <div className="toolbar">
              <div className="field" style={{ minWidth: 260 }}>
                <input placeholder="Notes (optional)" value={catatan} onChange={(e) => setCatatan(e.target.value)} />
              </div>
              <button type="button" className="btn btn-primary" disabled={loading !== null} onClick={tandaiDicek}>
                {loading === "cek" ? "Confirming..." : "Mark as Verified"}
              </button>
            </div>
          )}
        </div>
      </div>

      {riwayat.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <p style={{ margin: "0 0 6px" }}><b>Version History</b></p>
          <div className="table-wrap">
            <table>
              <thead><tr>
                <th>Step</th><th>File</th><th>Timestamp</th><th>By</th><th></th>
              </tr></thead>
              <tbody>
                {riwayat.map((r) => (
                  <tr key={r.id}>
                    <td>{LABEL_LANGKAH[r.langkah] ?? r.langkah}</td>
                    <td>{r.namaFile ?? (r.catatan ? <span className="subtitle">{r.catatan}</span> : "-")}</td>
                    <td>{formatTanggalJam(r.waktu)}</td>
                    <td>{r.namaUser ?? "-"}</td>
                    <td>
                      {r.namaFile && (
                        <a href={`/api/pengajuan/${pengajuanId}/gr-request/riwayat/${r.id}`} className="btn-text">Download</a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
