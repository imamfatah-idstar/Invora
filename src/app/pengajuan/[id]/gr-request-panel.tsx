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
  generate: "Generate sheet Vendor",
  balikan: "Unggah balikan XL",
  gabung: "Gabungkan otomatis",
  cek: "Konfirmasi sudah dicek",
};

function formatTanggalJam(iso: string | null) {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
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
    if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error ?? "Gagal generate."); setLoading(null); return; }
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
    if (!file) { setError("Pilih file dulu."); return; }
    setLoading("balikan");
    const formData = new FormData();
    formData.set("file", file);
    const res = await fetch(`/api/pengajuan/${pengajuanId}/gr-request/balikan`, { method: "POST", body: formData });
    setLoading(null);
    if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error ?? "Gagal mengunggah."); return; }
    setFile(null);
    (e.target as HTMLFormElement).reset();
    router.refresh();
  }

  async function gabungkan() {
    setError(null); setLoading("gabung");
    const res = await fetch(`/api/pengajuan/${pengajuanId}/gr-request/gabung`, { method: "POST" });
    const d = await res.json().catch(() => ({}));
    setLoading(null);
    if (!res.ok) { setError(d.error ?? "Gagal menggabungkan."); return; }
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
    if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error ?? "Gagal menandai."); return; }
    setCatatan("");
    router.refresh();
  }

  return (
    <div className="card" style={{ marginTop: 20 }}>
      <h3 style={{ marginTop: 0 }}>GR Request (Excel) — untuk Get Approve</h3>
      <p className="subtitle">
        Alur: (1) generate sheet Vendor &rarr; (2) kirim ke tim XL, tim isi sheet SOW &amp; COVER &rarr;
        (3) unggah balikannya di sini, gabungkan otomatis &rarr; (4) Checker konfirmasi sudah dicek.
      </p>

      {error && <div className="alert alert-danger">{error}</div>}
      {peringatan.length > 0 && (
        <div className="alert alert-danger">
          {peringatan.map((p, i) => <div key={i}>&bull; {p}</div>)}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <p style={{ margin: "0 0 6px" }}>
            <b>Langkah 1 — Generate sheet Vendor</b>{" "}
            {data?.namaFileGenerate && <span className="subtitle">— terakhir: {data.namaFileGenerate} ({formatTanggalJam(data.digeneratePada)})</span>}
          </p>
          <button type="button" className="btn btn-primary" disabled={loading !== null} onClick={unduhGenerate}>
            {loading === "generate" ? "Generate..." : "Generate & Unduh"}
          </button>
        </div>

        <div>
          <p style={{ margin: "0 0 6px" }}>
            <b>Langkah 2 — Unggah balikan dari XL</b> (sheet SOW &amp; COVER sudah terisi){" "}
            {data?.namaFileBalikanXl && (
              <span className="subtitle">— terakhir: {data.namaFileBalikanXl} ({formatTanggalJam(data.diunggahBalikanPada)}{data.namaDiunggahBalikanOleh ? `, oleh ${data.namaDiunggahBalikanOleh}` : ""})</span>
            )}
          </p>
          <form onSubmit={unggahBalikan} className="toolbar">
            <div className="field">
              <input type="file" accept=".xlsx" onChange={(e) => setFile(e.target.files?.[0] ?? null)} required />
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading !== null}>
              {loading === "balikan" ? "Mengunggah..." : data?.namaFileBalikanXl ? "Ganti File" : "Unggah"}
            </button>
          </form>
        </div>

        <div>
          <p style={{ margin: "0 0 6px" }}>
            <b>Langkah 3 — Gabungkan otomatis</b>{" "}
            {data?.namaFileGabungan && (
              <span className="subtitle">— terakhir: {data.namaFileGabungan} ({formatTanggalJam(data.digabungPada)})</span>
            )}
          </p>
          <button type="button" className="btn btn-primary" disabled={loading !== null || !data?.namaFileBalikanXl} onClick={gabungkan}>
            {loading === "gabung" ? "Menggabungkan..." : "Gabungkan Otomatis"}
          </button>
          {data?.namaFileGabungan && (
            <a href={`/api/pengajuan/${pengajuanId}/gr-request/file/gabungan`} className="btn-text" style={{ marginLeft: 10 }}>
              Unduh hasil gabungan
            </a>
          )}
        </div>

        <div>
          <p style={{ margin: "0 0 6px" }}><b>Langkah 4 — Konfirmasi sudah dicek tim</b></p>
          {data?.dicekPada ? (
            <p style={{ margin: 0, color: "var(--color-success, #1a7f37)" }}>
              &#10003; Sudah dicek oleh <b>{data.namaDicekOleh}</b> pada {formatTanggalJam(data.dicekPada)}
              {data.catatanCek && <><br /><span className="subtitle">Catatan: {data.catatanCek}</span></>}
            </p>
          ) : role === "checker" ? (
            <div className="toolbar">
              <div className="field" style={{ minWidth: 260 }}>
                <input placeholder="Catatan (opsional)" value={catatan} onChange={(e) => setCatatan(e.target.value)} />
              </div>
              <button type="button" className="btn btn-primary" disabled={loading !== null || !data?.namaFileGabungan} onClick={tandaiDicek}>
                {loading === "cek" ? "Menandai..." : "Tandai Sudah Dicek"}
              </button>
            </div>
          ) : (
            <p className="subtitle" style={{ margin: 0 }}>Menunggu konfirmasi Checker.</p>
          )}
        </div>
      </div>

      {riwayat.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <p style={{ margin: "0 0 6px" }}><b>Riwayat Versi</b></p>
          <div className="table-wrap">
            <table>
              <thead><tr>
                <th>Langkah</th><th>File</th><th>Waktu</th><th>Oleh</th><th></th>
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
                        <a href={`/api/pengajuan/${pengajuanId}/gr-request/riwayat/${r.id}`} className="btn-text">Unduh</a>
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
