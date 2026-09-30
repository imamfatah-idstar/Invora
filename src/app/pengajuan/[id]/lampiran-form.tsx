"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function FormLampiran({ pengajuanId, labelSaran }: { pengajuanId: number; labelSaran?: string }) {
  const router = useRouter();
  const [label, setLabel] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!file) { setError("Pilih file dulu."); return; }
    setLoading(true);
    const formData = new FormData();
    formData.set("label", label);
    formData.set("file", file);
    const res = await fetch(`/api/pengajuan/${pengajuanId}/lampiran`, { method: "POST", body: formData });
    setLoading(false);
    if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error ?? "Gagal mengunggah."); return; }
    setLabel(""); setFile(null);
    (e.target as HTMLFormElement).reset();
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="toolbar">
      <div className="field" style={{ minWidth: 240 }}>
        <label>Nama/label lampiran</label>
        <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="cth Spreadsheet Tracking PO" required />
        {labelSaran && (
          <button type="button" className="btn-text" style={{ fontSize: 12, padding: 0, marginTop: 2 }} onClick={() => setLabel(labelSaran)}>
            Pakai label &quot;{labelSaran}&quot;
          </button>
        )}
      </div>
      <div className="field">
        <label>File (maks. 30MB)</label>
        <input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} required />
      </div>
      <button type="submit" disabled={loading} className="btn btn-primary">{loading ? "Mengunggah..." : "Unggah"}</button>
      {error && <div className="alert alert-danger" style={{ margin: 0 }}>{error}</div>}
    </form>
  );
}
