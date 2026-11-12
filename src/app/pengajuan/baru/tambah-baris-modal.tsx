"use client";

import ComboSelect from "@/components/combo-select";
import Decimal from "decimal.js";
import { useEffect, useState } from "react";

export type BarisTambahanInput = {
  personelId: number;
  namaPersonel: string;
  namaBaru?: string;
  simpanPemetaan?: boolean;
  nilaiRateDipakai: string;
  hariKerjaDapatDitagihkan: number;
  hariKerjaAcuanBulan: number;
  hasilHitung: string;
  nilaiPenuh: string;
  poLineItemId?: number | null;
  sumberHitung: "timesheet" | "kalender" | "manual";
  tanggalTimesheet?: string | null;
};

export type PersonelOpsi = {
  id: number;
  nama: string;
  rateTerakhir: string | null;
};

export type LineItemOpsi = {
  id: number;
  poId: number;
  nomorLine: number;
  shortText: string;
  hargaSatuan: string;
};

function formatRupiah(nilai: string | number) {
  const n = typeof nilai === "string" ? Number(nilai) : nilai;
  if (isNaN(n)) return "Rp0,00";
  return "Rp" + n.toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function TambahBarisModal({
  poId,
  periode,
  hariKerjaAcuanDefault,
  daftarPersonel,
  daftarPoLineItem,
  personelSudahAdaIds,
  onTambah,
  onTutup,
}: {
  poId: number;
  periode: string;
  hariKerjaAcuanDefault: number;
  daftarPersonel: PersonelOpsi[];
  daftarPoLineItem: LineItemOpsi[];
  personelSudahAdaIds: Set<number>;
  onTambah: (baris: BarisTambahanInput) => void;
  onTutup: () => void;
}) {
  const [mode, setMode] = useState<"pilih" | "baru">("pilih");
  const [personelId, setPersonelId] = useState<string>("");
  const [namaBaru, setNamaBaru] = useState("");
  const [nilaiRate, setNilaiRate] = useState("");
  const [hariKerjaAcuan, setHariKerjaAcuan] = useState<number>(hariKerjaAcuanDefault || 21);
  const [hariKerjaDitagihkan, setHariKerjaDitagihkan] = useState<number>(hariKerjaAcuanDefault || 21);
  const [poLineItemId, setPoLineItemId] = useState<string>("");
  const [tanggalTimesheet, setTanggalTimesheet] = useState<string>("");
  const [sumberHitung, setSumberHitung] = useState<"timesheet" | "kalender" | "manual">("kalender");
  const [simpanPemetaan, setSimpanPemetaan] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filter line item yang sesuai dengan PO aktif
  const lineItemsPo = daftarPoLineItem.filter((li) => li.poId === poId);

  // Update default hari kerja jika prop berubah
  useEffect(() => {
    if (hariKerjaAcuanDefault && hariKerjaAcuanDefault > 0) {
      setHariKerjaAcuan(hariKerjaAcuanDefault);
      setHariKerjaDitagihkan(hariKerjaAcuanDefault);
    }
  }, [hariKerjaAcuanDefault]);

  // Handle pilih personel dari master
  function onPilihPersonel(idStr: string) {
    setPersonelId(idStr);
    setError(null);
    const pid = Number(idStr);
    if (!pid) return;

    if (personelSudahAdaIds.has(pid)) {
      setError("Personel ini sudah ada di dalam tabel pengajuan.");
    }

    const p = daftarPersonel.find((item) => item.id === pid);
    if (p?.rateTerakhir) {
      setNilaiRate(p.rateTerakhir);
    }
  }

  // Hitung prorata real-time
  const hitungEstimasi = (): string => {
    try {
      if (!nilaiRate || isNaN(Number(nilaiRate)) || Number(nilaiRate) <= 0) return "0.00";
      if (!hariKerjaAcuan || hariKerjaAcuan <= 0) return "0.00";
      const rateDec = new Decimal(nilaiRate);
      const hasil = rateDec.times(hariKerjaDitagihkan).dividedBy(hariKerjaAcuan);
      return hasil.toFixed(2);
    } catch {
      return "0.00";
    }
  };

  const estimasiNominal = hitungEstimasi();

  function submit() {
    setError(null);

    let finalPersonelId: number;
    let finalNama: string;

    if (mode === "pilih") {
      if (!personelId) {
        setError("Silakan pilih personel terlebih dahulu.");
        return;
      }
      finalPersonelId = Number(personelId);
      if (personelSudahAdaIds.has(finalPersonelId)) {
        setError("Personel ini sudah terdaftar di pengajuan.");
        return;
      }
      const p = daftarPersonel.find((item) => item.id === finalPersonelId);
      finalNama = p?.nama || "Personel";
    } else {
      if (!namaBaru.trim()) {
        setError("Nama personel baru wajib diisi.");
        return;
      }
      // ID sementara negatif agar unik di frontend
      finalPersonelId = -Date.now();
      finalNama = namaBaru.trim();
    }

    if (!nilaiRate || isNaN(Number(nilaiRate)) || Number(nilaiRate) <= 0) {
      setError("Nilai rate harus berupa angka lebih dari 0.");
      return;
    }
    if (hariKerjaAcuan <= 0) {
      setError("Hari kerja acuan bulan harus lebih dari 0.");
      return;
    }
    if (hariKerjaDitagihkan < 0) {
      setError("Hari kerja dapat ditagihkan tidak boleh bernilai negatif.");
      return;
    }

    const barisData: BarisTambahanInput = {
      personelId: finalPersonelId,
      namaPersonel: finalNama,
      namaBaru: mode === "baru" ? finalNama : undefined,
      simpanPemetaan,
      nilaiRateDipakai: new Decimal(nilaiRate).toFixed(2),
      hariKerjaDapatDitagihkan: hariKerjaDitagihkan,
      hariKerjaAcuanBulan: hariKerjaAcuan,
      hasilHitung: estimasiNominal,
      nilaiPenuh: estimasiNominal,
      poLineItemId: poLineItemId ? Number(poLineItemId) : null,
      sumberHitung: tanggalTimesheet ? "timesheet" : sumberHitung,
      tanggalTimesheet: tanggalTimesheet || null,
    };

    onTambah(barisData);
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 60,
        padding: 16,
      }}
    >
      <div
        className="card"
        style={{
          width: 540,
          maxWidth: "95vw",
          maxHeight: "90vh",
          overflowY: "auto",
          padding: "20px 24px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h3 style={{ margin: 0, fontSize: 18 }}>➕ Tambah Baris Personel Baru</h3>
          <button
            type="button"
            onClick={onTutup}
            style={{
              background: "transparent",
              border: "none",
              fontSize: 18,
              cursor: "pointer",
              color: "var(--muted, #64748b)",
            }}
          >
            ✕
          </button>
        </div>

        <p style={{ fontSize: 13, color: "var(--muted, #64748b)", marginTop: 0, marginBottom: 16 }}>
          Tambahkan personel tambahan atau ad-hoc ke pengajuan periode <b>{periode}</b>. Sistem akan menghitung prorata tagihan secara otomatis.
        </p>

        {/* Tab mode selection */}
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <button
            type="button"
            className={`btn ${mode === "pilih" ? "btn-primary" : "btn-secondary"}`}
            style={{ flex: 1, padding: "8px 12px", fontSize: 13 }}
            onClick={() => {
              setMode("pilih");
              setError(null);
            }}
          >
            Pilih dari Master Personel
          </button>
          <button
            type="button"
            className={`btn ${mode === "baru" ? "btn-primary" : "btn-secondary"}`}
            style={{ flex: 1, padding: "8px 12px", fontSize: 13 }}
            onClick={() => {
              setMode("baru");
              setError(null);
            }}
          >
            + Input Personel Baru
          </button>
        </div>

        {mode === "pilih" ? (
          <div className="field" style={{ marginBottom: 14 }}>
            <label style={{ fontWeight: 600 }}>Pilih Personel <span style={{ color: "red" }}>*</span></label>
            <ComboSelect
              value={personelId}
              onChange={onPilihPersonel}
              opsi={daftarPersonel.map((p) => ({
                value: p.id,
                label: p.nama + (p.rateTerakhir ? ` — (${formatRupiah(p.rateTerakhir)})` : ""),
              }))}
              placeholderCari="Cari nama personel..."
              kosongLabel="-- Pilih Personel --"
            />
          </div>
        ) : (
          <div className="field" style={{ marginBottom: 14 }}>
            <label style={{ fontWeight: 600 }}>Nama Personel Baru <span style={{ color: "red" }}>*</span></label>
            <input
              type="text"
              value={namaBaru}
              onChange={(e) => setNamaBaru(e.target.value)}
              placeholder="Contoh: John Doe"
            />
            <span style={{ fontSize: 12, color: "var(--muted, #64748b)", marginTop: 4 }}>
              Personel baru akan otomatis didaftarkan ke Master Data saat pengajuan disimpan.
            </span>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
          <div className="field">
            <label style={{ fontWeight: 600 }}>Rate / Bulan (Rp) <span style={{ color: "red" }}>*</span></label>
            <input
              type="number"
              min="0"
              step="1000"
              value={nilaiRate}
              onChange={(e) => setNilaiRate(e.target.value)}
              placeholder="Contoh: 15000000"
            />
            <div style={{ fontSize: 12, color: "var(--muted, #64748b)", marginTop: 2 }}>
              {nilaiRate ? formatRupiah(nilaiRate) : "Rp0"}
            </div>
          </div>

          <div className="field">
            <label style={{ fontWeight: 600 }}>PO Line Item (Opsional)</label>
            <select value={poLineItemId} onChange={(e) => setPoLineItemId(e.target.value)}>
              <option value="">-- Tanpa Line Item --</option>
              {lineItemsPo.map((li) => (
                <option key={li.id} value={li.id}>
                  Line {li.nomorLine}: {li.shortText} ({formatRupiah(li.hargaSatuan)})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
          <div className="field">
            <label style={{ fontWeight: 600 }}>Hari Hadir / Billable <span style={{ color: "red" }}>*</span></label>
            <input
              type="number"
              min="0"
              value={hariKerjaDitagihkan}
              onChange={(e) => setHariKerjaDitagihkan(Number(e.target.value))}
            />
            <span style={{ fontSize: 11, color: "var(--muted, #64748b)" }}>Hari kerja yang ditagihkan</span>
          </div>

          <div className="field">
            <label style={{ fontWeight: 600 }}>Hari Kerja Acuan Bulan <span style={{ color: "red" }}>*</span></label>
            <input
              type="number"
              min="1"
              value={hariKerjaAcuan}
              onChange={(e) => setHariKerjaAcuan(Number(e.target.value))}
            />
            <span style={{ fontSize: 11, color: "var(--muted, #64748b)" }}>Total hari kerja acuan bulan</span>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
          <div className="field">
            <label style={{ fontWeight: 600 }}>Tanggal Timesheet (Opsional)</label>
            <input
              type="date"
              value={tanggalTimesheet}
              onChange={(e) => {
                setTanggalTimesheet(e.target.value);
                if (e.target.value) setSumberHitung("timesheet");
              }}
            />
          </div>

          <div className="field">
            <label style={{ fontWeight: 600 }}>Sumber Perhitungan</label>
            <select
              value={tanggalTimesheet ? "timesheet" : sumberHitung}
              onChange={(e) => setSumberHitung(e.target.value as "timesheet" | "kalender" | "manual")}
            >
              <option value="kalender">Working Calendar (Kalender)</option>
              <option value="timesheet">Timesheet</option>
              <option value="manual">Manual</option>
            </select>
          </div>
        </div>

        {/* Live Prorata Calculation Box */}
        <div
          style={{
            background: "var(--color-bg-alt, #f0fdf4)",
            border: "1px solid #bbf7d0",
            borderRadius: 6,
            padding: "10px 14px",
            marginBottom: 16,
          }}
        >
          <div style={{ fontSize: 12, color: "#166534", marginBottom: 2 }}>
            💡 <b>Estimasi Prorata Tagihan:</b>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <span style={{ fontSize: 12, color: "#15803d" }}>
              ({hariKerjaDitagihkan} / {hariKerjaAcuan}) × {formatRupiah(nilaiRate || "0")}
            </span>
            <span style={{ fontSize: 16, fontWeight: 700, color: "#166534" }}>
              {formatRupiah(estimasiNominal)}
            </span>
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={simpanPemetaan}
              onChange={(e) => setSimpanPemetaan(e.target.checked)}
            />
            Simpan juga pemetaan personel ini ke PO untuk periode mendatang
          </label>
        </div>

        {error && <div className="alert alert-danger" style={{ marginBottom: 14 }}>{error}</div>}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button type="button" className="btn btn-secondary" onClick={onTutup}>
            Batal
          </button>
          <button type="button" className="btn btn-primary" onClick={submit}>
            ➕ Tambahkan Baris
          </button>
        </div>
      </div>
    </div>
  );
}

