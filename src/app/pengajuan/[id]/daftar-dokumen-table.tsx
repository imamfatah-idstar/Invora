"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export type DokumenItem = {
  id: number;
  jenis: string;
  versi: number;
  dibuatPada: string;
  status: string;
  disetujuiPada?: string | null;
  disetujuiOlehUserId?: number | null;
  namaChecker?: string | null;
  catatanChecker?: string | null;
};

const LABEL_JENIS_DOKUMEN: Record<string, string> = {
  CAC: "CAC (Konfirmasi Pengajuan)",
  BAST: "BAST (Berita Acara)",
  GR: "GR (Good Receipt BAU)",
};

type Props = {
  pengajuanId: number;
  initialDokumen: DokumenItem[];
  userRole: string;
  userNama: string;
  isKlienXl?: boolean;
};

export default function DaftarDokumenTable({
  pengajuanId,
  initialDokumen,
  userRole,
  userNama,
  isKlienXl = true,
}: Props) {
  const router = useRouter();
  const [daftar, setDaftar] = useState<DokumenItem[]>(initialDokumen);
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDaftar(initialDokumen);
  }, [initialDokumen]);

  async function handleDeleteSingle(doc: DokumenItem) {
    if (!confirm(`Hapus dokumen ${doc.jenis} (v${doc.versi}) dari sistem?`)) return;
    setLoadingId(doc.id);
    setError(null);
    try {
      const res = await fetch(`/api/pengajuan/${pengajuanId}/dokumen/${doc.id}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Gagal menghapus dokumen");
      }
      setDaftar((prev) => prev.filter((d) => d.id !== doc.id));
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan saat menghapus dokumen");
    } finally {
      setLoadingId(null);
    }
  }

  // Modal revisi per dokumen
  const [modalRevisiDoc, setModalRevisiDoc] = useState<DokumenItem | null>(null);
  const [catatanRevisi, setCatatanRevisi] = useState("");

  const isChecker = userRole === "checker" || userRole === "admin";
  const pendingCount = daftar.filter((d) => d.status !== "disetujui").length;

  function formatWaktu(iso?: string | null) {
    if (!iso) return "-";
    try {
      return new Date(iso).toLocaleString("id-ID", {
        dateStyle: "short",
        timeStyle: "short",
      });
    } catch {
      return iso;
    }
  }

  async function handleApproveSingle(doc: DokumenItem) {
    setLoadingId(doc.id);
    setError(null);
    try {
      const res = await fetch(`/api/pengajuan/${pengajuanId}/dokumen/${doc.id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tindakan: "setujui" }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal menyetujui dokumen");
      }
      setDaftar((prev) =>
        prev.map((d) =>
          d.id === doc.id
            ? {
                ...d,
                status: "disetujui",
                disetujuiPada: data.disetujuiPada || new Date().toISOString(),
                namaChecker: data.checkerNama || userNama,
                catatanChecker: null,
              }
            : d
        )
      );
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setLoadingId(null);
    }
  }

  async function handleRevisiSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!modalRevisiDoc) return;
    setLoadingId(modalRevisiDoc.id);
    setError(null);
    try {
      const res = await fetch(`/api/pengajuan/${pengajuanId}/dokumen/${modalRevisiDoc.id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tindakan: "revisi", catatan: catatanRevisi }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal mengirim revisi");
      }
      setDaftar((prev) =>
        prev.map((d) =>
          d.id === modalRevisiDoc.id
            ? {
                ...d,
                status: "perlu_revisi",
                disetujuiPada: null,
                namaChecker: null,
                catatanChecker: catatanRevisi || "Perlu revisi",
              }
            : d
        )
      );
      setModalRevisiDoc(null);
      setCatatanRevisi("");
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setLoadingId(null);
    }
  }

  async function handleBulkApprove() {
    setBulkLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/pengajuan/${pengajuanId}/dokumen/bulk-approve`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal menyetujui dokumen secara kolektif");
      }
      setDaftar((prev) =>
        prev.map((d) => ({
          ...d,
          status: "disetujui",
          disetujuiPada: new Date().toISOString(),
          namaChecker: userNama,
          catatanChecker: null,
        }))
      );
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setBulkLoading(false);
    }
  }

  return (
    <div style={{ marginTop: 16 }}>
      {/* Alert bar for Checker with pending documents */}
      {isChecker && pendingCount > 0 && (
        <div
          style={{
            backgroundColor: "#eff6ff",
            border: "1px solid #bfdbfe",
            borderRadius: 6,
            padding: "10px 14px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 10,
            marginBottom: 14,
          }}
        >
          <div style={{ fontSize: 13, color: "#1e40af", display: "flex", alignItems: "center", gap: 6 }}>
            <span>🔍</span>
            <span>
              Ada <b>{pendingCount} dokumen</b> yang belum disetujui Checker. Anda dapat memeriksa satu per satu atau menyetujui semuanya sekaligus.
            </span>
          </div>
          <button
            type="button"
            onClick={handleBulkApprove}
            disabled={bulkLoading}
            style={{
              backgroundColor: "#10b981",
              color: "#ffffff",
              border: "none",
              borderRadius: 5,
              padding: "6px 12px",
              fontWeight: 600,
              fontSize: 12.5,
              cursor: bulkLoading ? "not-allowed" : "pointer",
            }}
          >
            {bulkLoading
              ? "Memproses..."
              : isKlienXl
                ? "✓ Approve Semua Dokumen (CAC, BAST, GR)"
                : "✓ Approve Dokumen BAST"}
          </button>
        </div>
      )}

      {error && <div className="alert alert-danger" style={{ marginBottom: 12 }}>{error}</div>}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Tipe Dokumen</th>
              <th>Versi</th>
              <th>Status Approval</th>
              <th>Pemeriksa / Checker</th>
              <th>Dibuat Pada</th>
              <th style={{ textAlign: "right" }}>Aksi Sistem</th>
            </tr>
          </thead>
          <tbody>
            {daftar.map((d) => {
              const isApproved = d.status === "disetujui";
              const isRevision = d.status === "perlu_revisi";
              const isLoading = loadingId === d.id;

              return (
                <tr key={d.id}>
                  <td style={{ fontWeight: 600 }}>
                    {LABEL_JENIS_DOKUMEN[d.jenis] ?? d.jenis}
                  </td>
                  <td>v{d.versi}</td>
                  <td>
                    {isApproved ? (
                      <span
                        style={{
                          backgroundColor: "#d1fae5",
                          color: "#065f46",
                          padding: "3px 8px",
                          borderRadius: 12,
                          fontSize: 12,
                          fontWeight: 600,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        ✓ Disetujui
                      </span>
                    ) : isRevision ? (
                      <span
                        style={{
                          backgroundColor: "#fee2e2",
                          color: "#991b1b",
                          padding: "3px 8px",
                          borderRadius: 12,
                          fontSize: 12,
                          fontWeight: 600,
                        }}
                        title={d.catatanChecker || undefined}
                      >
                        ⚠️ Perlu Revisi
                      </span>
                    ) : (
                      <span
                        style={{
                          backgroundColor: "#f1f5f9",
                          color: "#475569",
                          padding: "3px 8px",
                          borderRadius: 12,
                          fontSize: 12,
                          fontWeight: 500,
                        }}
                      >
                        Draft (Menunggu Checker)
                      </span>
                    )}
                  </td>
                  <td style={{ fontSize: 13 }}>
                    {isApproved ? (
                      <div>
                        <b>{d.namaChecker || "Checker"}</b>
                        <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>
                          {formatWaktu(d.disetujuiPada)}
                        </div>
                      </div>
                    ) : isRevision ? (
                      <div style={{ color: "#b91c1c", fontSize: 12 }}>
                        {d.catatanChecker ? `Catatan: "${d.catatanChecker}"` : "Revisi diminta"}
                      </div>
                    ) : (
                      <span style={{ color: "var(--color-text-muted)", fontSize: 12 }}>
                        Belum diverifikasi
                      </span>
                    )}
                  </td>
                  <td style={{ fontSize: 12.5 }}>{d.dibuatPada}</td>
                  <td style={{ textAlign: "right" }}>
                    <div style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                      <Link
                        href={`/pengajuan/${pengajuanId}/dokumen/${d.id}`}
                        className="btn-text"
                        style={{ fontSize: 13 }}
                      >
                        Buka &rarr;
                      </Link>

                      {isChecker && !isApproved && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleApproveSingle(d)}
                            disabled={isLoading}
                            style={{
                              backgroundColor: "#10b981",
                              color: "#ffffff",
                              border: "none",
                              borderRadius: 4,
                              padding: "4px 8px",
                              fontSize: 12,
                              fontWeight: 600,
                              cursor: isLoading ? "not-allowed" : "pointer",
                            }}
                            title={`Setujui dokumen ${d.jenis}`}
                          >
                            {isLoading ? "..." : "✓ Approve"}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setModalRevisiDoc(d);
                              setCatatanRevisi("");
                            }}
                            disabled={isLoading}
                            style={{
                              backgroundColor: "#ffffff",
                              color: "#b45309",
                              border: "1px solid #f59e0b",
                              borderRadius: 4,
                              padding: "3px 7px",
                              fontSize: 11.5,
                              cursor: isLoading ? "not-allowed" : "pointer",
                            }}
                            title="Minta revisi kepada petugas"
                          >
                            Revisi
                          </button>
                        </>
                      )}

                      <button
                        type="button"
                        onClick={() => handleDeleteSingle(d)}
                        disabled={isLoading}
                        style={{
                          backgroundColor: "#fee2e2",
                          color: "#dc2626",
                          border: "1px solid #fecaca",
                          borderRadius: 4,
                          padding: "3px 8px",
                          fontSize: 11.5,
                          fontWeight: 600,
                          cursor: isLoading ? "not-allowed" : "pointer",
                        }}
                        title={`Hapus dokumen ${d.jenis} dari sistem`}
                      >
                        {isLoading ? "..." : "🗑️ Delete"}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modal Minta Revisi */}
      {modalRevisiDoc && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
        >
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: 8,
              padding: 24,
              width: "100%",
              maxWidth: 440,
              boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)",
            }}
          >
            <h4 style={{ margin: "0 0 10px 0", fontSize: 16 }}>
              Minta Revisi Dokumen {modalRevisiDoc.jenis}
            </h4>
            <p style={{ fontSize: 13, color: "var(--color-text-muted)", margin: "0 0 14px 0" }}>
              Masukkan catatan perbaikan untuk dokumen ini:
            </p>
            <form onSubmit={handleRevisiSubmit}>
              <textarea
                value={catatanRevisi}
                onChange={(e) => setCatatanRevisi(e.target.value)}
                placeholder="Tuliskan bagian data yang perlu diperbaiki..."
                rows={3}
                style={{
                  width: "100%",
                  padding: "8px",
                  borderRadius: 6,
                  border: "1px solid #cbd5e1",
                  fontSize: 13,
                  boxSizing: "border-box",
                  marginBottom: 14,
                }}
                required
              />
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setModalRevisiDoc(null)}
                  disabled={loadingId !== null}
                  className="btn"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loadingId !== null}
                  style={{
                    backgroundColor: "#dc2626",
                    color: "#ffffff",
                    border: "none",
                    padding: "7px 14px",
                    borderRadius: 6,
                    fontWeight: 600,
                    fontSize: 13,
                    cursor: loadingId !== null ? "not-allowed" : "pointer",
                  }}
                >
                  {loadingId !== null ? "Menyimpan..." : "Kirim Revisi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

