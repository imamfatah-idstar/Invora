"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  pengajuanId: number;
  dokumenId: number;
  jenis: string;
  statusAwal: string;
  disetujuiPadaAwal?: string | null;
  namaCheckerAwal?: string | null;
  catatanCheckerAwal?: string | null;
  userRole: string;
  userNama: string;
};

export default function CheckerApprovalBar({
  pengajuanId,
  dokumenId,
  jenis,
  statusAwal,
  disetujuiPadaAwal,
  namaCheckerAwal,
  catatanCheckerAwal,
  userRole,
  userNama,
}: Props) {
  const router = useRouter();
  const [status, setStatus] = useState(statusAwal);
  const [disetujuiPada, setDisetujuiPada] = useState(disetujuiPadaAwal);
  const [namaChecker, setNamaChecker] = useState(namaCheckerAwal);
  const [catatanChecker, setCatatanChecker] = useState(catatanCheckerAwal);

  const [loading, setLoading] = useState(false);
  const [showRevisiModal, setShowRevisiModal] = useState(false);
  const [catatanInput, setCatatanInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  const isChecker = userRole === "checker" || userRole === "admin";
  const isDisetujui = status === "disetujui";
  const isPerluRevisi = status === "perlu_revisi";

  async function handleApprove() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/pengajuan/${pengajuanId}/dokumen/${dokumenId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tindakan: "setujui" }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal menyetujui dokumen");
      }
      setStatus("disetujui");
      setDisetujuiPada(data.disetujuiPada || new Date().toLocaleString("id-ID"));
      setNamaChecker(data.checkerNama || userNama);
      setCatatanChecker(null);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  }

  async function handleRevisiSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/pengajuan/${pengajuanId}/dokumen/${dokumenId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tindakan: "revisi", catatan: catatanInput }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal mengirim permintaan revisi");
      }
      setStatus("perlu_revisi");
      setDisetujuiPada(null);
      setNamaChecker(null);
      setCatatanChecker(catatanInput || "Perlu revisi");
      setShowRevisiModal(false);
      setCatatanInput("");
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  }

  function formatWaktu(iso?: string | null) {
    if (!iso) return "-";
    try {
      return new Date(iso).toLocaleString("id-ID", {
        dateStyle: "medium",
        timeStyle: "short",
      });
    } catch {
      return iso;
    }
  }

  return (
    <div className="no-print" style={{ marginBottom: 16 }}>
      {/* Banner Utama */}
      <div
        style={{
          borderRadius: 8,
          padding: "14px 18px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
          backgroundColor: isDisetujui
            ? "#ecfdf5"
            : isPerluRevisi
            ? "#fffbeb"
            : "#f0f7ff",
          border: isDisetujui
            ? "1px solid #a7f3d0"
            : isPerluRevisi
            ? "1px solid #fde68a"
            : "1px solid #bfdbfe",
          boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              fontSize: 22,
              lineHeight: 1,
            }}
          >
            {isDisetujui ? "✅" : isPerluRevisi ? "⚠️" : "🔍"}
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontWeight: 700, fontSize: 14, color: "#1e293b" }}>
                Status Verifikasi Checker ({jenis}):
              </span>
              <span
                style={{
                  display: "inline-block",
                  padding: "2px 8px",
                  borderRadius: 12,
                  fontSize: 12,
                  fontWeight: 600,
                  backgroundColor: isDisetujui
                    ? "#10b981"
                    : isPerluRevisi
                    ? "#f59e0b"
                    : "#64748b",
                  color: "#ffffff",
                }}
              >
                {isDisetujui
                  ? "✓ Disetujui Checker"
                  : isPerluRevisi
                  ? "Perlu Revisi"
                  : "Draft / Menunggu Review"}
              </span>
            </div>
            <div style={{ fontSize: 13, color: "#475569", marginTop: 4 }}>
              {isDisetujui ? (
                <>
                  Diverifikasi &amp; disetujui oleh <b>{namaChecker || "Checker"}</b> pada{" "}
                  <b>{formatWaktu(disetujuiPada)}</b>. Dokumen resmi siap dipakai.
                </>
              ) : isPerluRevisi ? (
                <>
                  Checker meminta revisi: <i>&quot;{catatanChecker}&quot;</i>. Harap perbaiki sebelum approval.
                </>
              ) : isChecker ? (
                <>
                  Sebagai <b>Checker</b>, periksa keabsahan isi dokumen di bawah. Klik <b>Setujui {jenis}</b> jika data sudah valid.
                </>
              ) : (
                <>
                  Menunggu verifikasi dan persetujuan dari <b>Checker</b>.
                </>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons for Checker */}
        {isChecker && (
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            {!isDisetujui ? (
              <>
                <button
                  type="button"
                  onClick={handleApprove}
                  disabled={loading}
                  style={{
                    backgroundColor: "#10b981",
                    color: "#ffffff",
                    border: "none",
                    padding: "8px 16px",
                    borderRadius: 6,
                    fontWeight: 600,
                    fontSize: 13,
                    cursor: loading ? "not-allowed" : "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  {loading ? "Memproses..." : `✓ Setujui ${jenis}`}
                </button>
                <button
                  type="button"
                  onClick={() => setShowRevisiModal(true)}
                  disabled={loading}
                  style={{
                    backgroundColor: "#ffffff",
                    color: "#b45309",
                    border: "1px solid #f59e0b",
                    padding: "8px 14px",
                    borderRadius: 6,
                    fontWeight: 600,
                    fontSize: 13,
                    cursor: loading ? "not-allowed" : "pointer",
                  }}
                >
                  Minta Revisi
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setShowRevisiModal(true)}
                disabled={loading}
                style={{
                  backgroundColor: "#ffffff",
                  color: "#64748b",
                  border: "1px solid #cbd5e1",
                  padding: "6px 12px",
                  borderRadius: 6,
                  fontSize: 12,
                  cursor: loading ? "not-allowed" : "pointer",
                }}
                title="Batalkan persetujuan dan minta perbaikan data"
              >
                Batalkan / Minta Revisi
              </button>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="alert alert-danger" style={{ marginTop: 8 }}>
          {error}
        </div>
      )}

      {/* Modal Minta Revisi */}
      {showRevisiModal && (
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
              maxWidth: 480,
              boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)",
            }}
          >
            <h4 style={{ margin: "0 0 12px 0", fontSize: 16 }}>
              Minta Revisi Dokumen {jenis}
            </h4>
            <p style={{ fontSize: 13, color: "var(--color-text-muted)", margin: "0 0 16px 0" }}>
              Tuliskan catatan alasan revisi agar Petugas dapat memperbaiki atau mengenerate ulang dokumen yang sesuai.
            </p>
            <form onSubmit={handleRevisiSubmit}>
              <textarea
                value={catatanInput}
                onChange={(e) => setCatatanInput(e.target.value)}
                placeholder="Contoh: Nama PIC perlu disesuaikan dengan surat penugasan terbaru, atau periode hari kerja kurang 1 hari..."
                rows={3}
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  borderRadius: 6,
                  border: "1px solid #cbd5e1",
                  fontSize: 13,
                  boxSizing: "border-box",
                  marginBottom: 16,
                }}
                required
              />
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setShowRevisiModal(false)}
                  disabled={loading}
                  className="btn"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    backgroundColor: "#dc2626",
                    color: "#ffffff",
                    border: "none",
                    padding: "8px 16px",
                    borderRadius: 6,
                    fontWeight: 600,
                    fontSize: 13,
                    cursor: loading ? "not-allowed" : "pointer",
                  }}
                >
                  {loading ? "Menyimpan..." : "Kirim Permintaan Revisi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

