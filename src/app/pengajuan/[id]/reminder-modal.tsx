"use client";

import { useState, useEffect } from "react";
import {
  ReminderType,
  generateEmailReminder,
  extractEmailFromKontak,
  rekomendasiTipeReminder,
} from "@/lib/reminder";

interface ReminderItemLog {
  id: number;
  tipeReminder: string;
  emailPenerima: string;
  namaPicPenerima: string | null;
  subjek: string;
  pesanTeks: string;
  metode: string;
  statusKirim: string;
  dikirimPada: string;
  pengirimNama: string;
  pengirimRole: string;
}

interface ReminderModalProps {
  pengajuanId: number;
  nomorInvoice: string;
  nomorFakturPajak?: string | null;
  nomorPo: string;
  namaProyek: string;
  klien: string;
  namaPic?: string | null;
  kontakPic?: string | null;
  periode: string;
  tanggalInvoice: string;
  tanggalJatuhTempo: string;
  hariTerlambat: number;
  totalTagihan: number;
  terbayar: number;
  sisaPiutang: number;
}

export default function ReminderModal({
  pengajuanId,
  nomorInvoice,
  nomorFakturPajak,
  nomorPo,
  namaProyek,
  klien,
  namaPic,
  kontakPic,
  periode,
  tanggalInvoice,
  tanggalJatuhTempo,
  hariTerlambat,
  totalTagihan,
  terbayar,
  sisaPiutang,
}: ReminderModalProps) {
  const [buka, setBuka] = useState<boolean>(false);
  const [tipe, setTipe] = useState<ReminderType>(rekomendasiTipeReminder(hariTerlambat));
  const [emailPic, setEmailPic] = useState<string>(extractEmailFromKontak(kontakPic) || "finance@" + klien.toLowerCase().replace(/[^a-z0-9]/g, "") + ".co.id");
  const [namaPenerima, setNamaPenerima] = useState<string>(namaPic || "");
  const [subjekKustom, setSubjekKustom] = useState<string>("");
  const [pesanKustom, setPesanKustom] = useState<string>("");
  const [sedangKirim, setSedangKirim] = useState<boolean>(false);
  const [pesanStatus, setPesanStatus] = useState<{ tipe: "sukses" | "error"; text: string } | null>(null);
  const [salinSukses, setSalinSukses] = useState<boolean>(false);
  const [riwayat, setRiwayat] = useState<ReminderItemLog[]>([]);
  const [loadingRiwayat, setLoadingRiwayat] = useState<boolean>(false);

  // Generate template otomatis berdasarkan state
  const generated = generateEmailReminder({
    tipe,
    namaPic: namaPenerima,
    emailPic,
    klien,
    nomorInvoice,
    nomorFakturPajak,
    nomorPo,
    namaProyek,
    periode,
    tanggalInvoice,
    tanggalJatuhTempo,
    hariTerlambat,
    totalTagihan,
    terbayar,
    sisaPiutang,
  });

  // Sinkronisasi default subjek & pesan saat tipe berganti
  useEffect(() => {
    setSubjekKustom(generated.subjek);
    setPesanKustom(generated.pesanTeks);
  }, [tipe, emailPic, namaPenerima]);

  // Ambil riwayat pengingat
  const muatRiwayat = async () => {
    setLoadingRiwayat(true);
    try {
      const res = await fetch(`/api/pengajuan/${pengajuanId}/reminder`);
      const data = await res.json();
      if (data.data) {
        setRiwayat(data.data);
      }
    } catch {
      // Abaikan error fetch riwayat
    } finally {
      setLoadingRiwayat(false);
    }
  };

  useEffect(() => {
    if (buka) {
      muatRiwayat();
    }
  }, [buka]);

  // Handler Salin Teks
  const handleSalin = () => {
    navigator.clipboard.writeText(pesanKustom);
    setSalinSukses(true);
    setTimeout(() => setSalinSukses(false), 2500);
  };

  // Handler Buka Email Client (mailto:)
  const handleBukaMailto = () => {
    const url = `mailto:${encodeURIComponent(emailPic)}?subject=${encodeURIComponent(subjekKustom)}&body=${encodeURIComponent(pesanKustom)}`;
    window.open(url, "_blank");
  };

  // Handler Simpan Log Pengiriman
  const handleSimpanLog = async () => {
    setSedangKirim(true);
    setPesanStatus(null);
    try {
      const res = await fetch(`/api/pengajuan/${pengajuanId}/reminder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipeReminder: tipe,
          emailPenerima: emailPic,
          namaPicPenerima: namaPenerima,
          subjek: subjekKustom,
          pesanTeks: pesanKustom,
          metode: "mailto",
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Gagal mencatat log reminder.");
      }

      setPesanStatus({
        tipe: "sukses",
        text: "Log pengingat jatuh tempo berhasil disimpan ke audit sistem!",
      });
      muatRiwayat();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Terjadi kesalahan";
      setPesanStatus({ tipe: "error", text: message });
    } finally {
      setSedangKirim(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setBuka(true)}
        className="btn"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "8px 14px",
          fontSize: 13,
          fontWeight: 600,
          background: "#ffffff",
          border: "1px solid #cbd5e1",
          color: "#0f172a",
        }}
      >
        <span>✉️</span>
        <span>Pengingat Jatuh Tempo</span>
      </button>

      {buka && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.65)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: 16,
          }}
        >
          <div
            className="card"
            style={{
              width: "100%",
              maxWidth: 820,
              maxHeight: "92vh",
              overflowY: "auto",
              padding: 24,
              background: "#ffffff",
              borderRadius: 14,
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
            }}
          >
            {/* Header Modal */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16, borderBottom: "1px solid #e2e8f0", paddingBottom: 14 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 22 }}>✉️</span>
                  <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0, color: "#0f172a" }}>
                    Sistem Pengingat Jatuh Tempo (Automated Email Reminder)
                  </h2>
                </div>
                <p style={{ margin: "4px 0 0", fontSize: 13, color: "#64748b" }}>
                  Invoice: <b>{nomorInvoice}</b> &middot; Klien: <b>{klien}</b> &middot; Jatuh Tempo: <b>{tanggalJatuhTempo}</b> ({hariTerlambat > 0 ? `Menunggak ${hariTerlambat} hari` : `Dalam ${Math.abs(hariTerlambat)} hari`})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setBuka(false)}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: 20,
                  cursor: "pointer",
                  color: "#64748b",
                  padding: "4px 8px",
                  borderRadius: 6,
                }}
              >
                ✕
              </button>
            </div>

            {pesanStatus && (
              <div
                style={{
                  padding: "10px 14px",
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  marginBottom: 16,
                  background: pesanStatus.tipe === "sukses" ? "#dcfce7" : "#fee2e2",
                  color: pesanStatus.tipe === "sukses" ? "#166534" : "#991b1b",
                  border: `1px solid ${pesanStatus.tipe === "sukses" ? "#86efac" : "#fca5a5"}`,
                }}
              >
                {pesanStatus.text}
              </div>
            )}

            {/* Pilihan Template Reminder */}
            <div style={{ marginBottom: 18 }}>
              <label style={{ display: "block", fontSize: 12.5, fontWeight: 700, color: "#334155", marginBottom: 8, textTransform: "uppercase" }}>
                Pilih Tipe Surat / Tingkat Urgensi:
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 8 }}>
                {[
                  { id: "h-7", label: "H-7 (Awal)", desc: "Ramah & Sopan", color: "#0284c7" },
                  { id: "h-0", label: "Hari H (H-0)", desc: "Jatuh Tempo Hari Ini", color: "#16a34a" },
                  { id: "h+7", label: "H+7 (Follow-Up)", desc: "Lewat 7 Hari", color: "#d97706" },
                  { id: "h+14", label: "H+14 (Peringatan II)", desc: "Lewat 14 Hari", color: "#ea580c" },
                  { id: "h+30", label: "H+30 (Tunggakan)", desc: "Surat Peringatan Resmi", color: "#dc2626" },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setTipe(item.id as ReminderType)}
                    style={{
                      padding: "8px 10px",
                      textAlign: "left",
                      borderRadius: 8,
                      border: tipe === item.id ? `2px solid ${item.color}` : "1px solid #cbd5e1",
                      background: tipe === item.id ? `${item.color}10` : "#ffffff",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: tipe === item.id ? item.color : "#1e293b" }}>
                      {item.label}
                    </div>
                    <div style={{ fontSize: 10.5, color: "#64748b", marginTop: 2 }}>
                      {item.desc}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Penerima & Subjek */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 4 }}>
                  Nama PIC Penerima:
                </label>
                <input
                  type="text"
                  value={namaPenerima}
                  onChange={(e) => setNamaPenerima(e.target.value)}
                  placeholder="Nama PIC Klien..."
                  style={{ width: "100%", padding: "7px 10px", fontSize: 13, borderRadius: 6, border: "1px solid #cbd5e1" }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 4 }}>
                  Email PIC Klien:
                </label>
                <input
                  type="email"
                  value={emailPic}
                  onChange={(e) => setEmailPic(e.target.value)}
                  placeholder="pic@perusahaan.com"
                  style={{ width: "100%", padding: "7px 10px", fontSize: 13, borderRadius: 6, border: "1px solid #cbd5e1" }}
                />
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 4 }}>
                Subjek Email:
              </label>
              <input
                type="text"
                value={subjekKustom}
                onChange={(e) => setSubjekKustom(e.target.value)}
                style={{ width: "100%", padding: "7px 10px", fontSize: 13, borderRadius: 6, border: "1px solid #cbd5e1", fontWeight: 600 }}
              />
            </div>

            {/* Body Email Preview & Editable */}
            <div style={{ marginBottom: 18 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#475569" }}>
                  Isi Surat / Draft Email (Dapat diedit sebelum dikirim):
                </label>
                <button
                  type="button"
                  onClick={handleSalin}
                  style={{
                    background: "none",
                    border: "none",
                    fontSize: 12,
                    color: salinSukses ? "#16a34a" : "#0284c7",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  {salinSukses ? "✓ Berhasil Disalin!" : "📋 Salin Seluruh Teks"}
                </button>
              </div>
              <textarea
                rows={12}
                value={pesanKustom}
                onChange={(e) => setPesanKustom(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  fontSize: 12.5,
                  fontFamily: "monospace",
                  lineHeight: 1.5,
                  borderRadius: 8,
                  border: "1px solid #cbd5e1",
                  background: "#f8fafc",
                }}
              />
            </div>

            {/* Tombol Aksi */}
            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 12, borderTop: "1px solid #e2e8f0", paddingTop: 16 }}>
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  type="button"
                  onClick={handleBukaMailto}
                  className="btn"
                  style={{
                    padding: "9px 16px",
                    fontSize: 13,
                    fontWeight: 700,
                    background: "#0284c7",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: 8,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <span>✉️</span>
                  <span>Buka di Email Client (Outlook/Gmail)</span>
                </button>

                <button
                  type="button"
                  onClick={handleSimpanLog}
                  disabled={sedangKirim}
                  className="btn"
                  style={{
                    padding: "9px 16px",
                    fontSize: 13,
                    fontWeight: 600,
                    background: "#ffffff",
                    border: "1px solid #cbd5e1",
                    borderRadius: 8,
                    cursor: "pointer",
                  }}
                >
                  {sedangKirim ? "Menyimpan..." : "💾 Catat Pengiriman ke Audit"}
                </button>
              </div>

              <button
                type="button"
                onClick={() => setBuka(false)}
                className="btn"
                style={{ padding: "8px 14px", fontSize: 13 }}
              >
                Tutup
              </button>
            </div>

            {/* Riwayat Pengingat Sebelumnya */}
            <div style={{ marginTop: 24, borderTop: "1px solid #e2e8f0", paddingTop: 16 }}>
              <h4 style={{ fontSize: 13, fontWeight: 700, color: "#1e293b", margin: "0 0 10px" }}>
                📜 Riwayat Pengingat yang Pernah Dikirim ({riwayat.length})
              </h4>
              {loadingRiwayat ? (
                <div style={{ fontSize: 12, color: "#64748b" }}>Memuat riwayat...</div>
              ) : riwayat.length === 0 ? (
                <div style={{ fontSize: 12, color: "#64748b", fontStyle: "italic" }}>
                  Belum ada catatan pengingat yang pernah dikirim untuk invoice ini.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {riwayat.map((r) => (
                    <div
                      key={r.id}
                      style={{
                        padding: "8px 12px",
                        background: "#f8fafc",
                        borderRadius: 6,
                        border: "1px solid #e2e8f0",
                        fontSize: 12,
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div>
                        <span style={{ fontWeight: 700, color: "#0369a1", textTransform: "uppercase", marginRight: 8 }}>
                          [{r.tipeReminder}]
                        </span>
                        <span>Kepada: <b>{r.emailPenerima}</b> ({r.namaPicPenerima || "-"})</span>
                        <div style={{ color: "#64748b", fontSize: 11, marginTop: 2 }}>
                          Subjek: {r.subjek}
                        </div>
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 12 }}>
                        <div style={{ fontWeight: 600, color: "#334155" }}>{r.pengirimNama}</div>
                        <div style={{ color: "#64748b", fontSize: 11 }}>{r.dikirimPada.slice(0, 16)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
