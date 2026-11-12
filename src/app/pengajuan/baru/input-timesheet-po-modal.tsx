"use client";

import { useEffect, useState } from "react";
import Decimal from "decimal.js";
import ComboSelect from "@/components/combo-select";
import { parseCsv, csvKeObjek } from "@/lib/csv";
import { PersonelOpsi } from "./tambah-baris-modal";

type BarisTimesheetPo = {
  personelId: number;
  namaPersonel: string;
  nilaiRate: string | null;
  totalHariKerja: number;
  totalKehadiran: number;
  tanggalTimesheet: string;
  namaFileAda: string | null;
  dipilih: boolean;
};

function formatRupiah(nilai: string | number | null) {
  if (nilai === null || nilai === undefined || nilai === "") return "-";
  const n = typeof nilai === "string" ? Number(nilai) : nilai;
  if (isNaN(n)) return "-";
  return "Rp" + n.toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function hitungProrataBaris(rate: string | null, hadir: number, hariKerja: number): string | null {
  if (!rate || isNaN(Number(rate)) || Number(rate) <= 0) return null;
  if (!hariKerja || hariKerja <= 0 || hadir < 0) return null;
  try {
    return new Decimal(rate).times(hadir).dividedBy(hariKerja).toFixed(2);
  } catch {
    return null;
  }
}

export default function InputTimesheetPoModal({
  poId,
  poLabel,
  userXlId,
  periodeAwal,
  daftarPersonelMaster,
  onTutup,
  onSelesai,
}: {
  poId: number | string;
  poLabel: string;
  userXlId: number | string;
  periodeAwal: string;
  daftarPersonelMaster: PersonelOpsi[];
  onTutup: () => void;
  onSelesai: (periodeTerpilih: string) => void;
}) {
  const hariIni = new Date().toISOString().slice(0, 10);
  const bulanIni = new Date().toISOString().slice(0, 7);

  const [periode, setPeriode] = useState(periodeAwal || bulanIni);
  const [tanggalTimesheetGlobal, setTanggalTimesheetGlobal] = useState(hariIni);
  const [workdaysGlobal, setWorkdaysGlobal] = useState<number>(21);
  const [kehadiranGlobal, setKehadiranGlobal] = useState<number>(21);
  const [file, setFile] = useState<File | null>(null);
  const [baris, setBaris] = useState<BarisTimesheetPo[]>([]);
  const [personelTambahId, setPersonelTambahId] = useState<string>("");
  const [loadingData, setLoadingData] = useState(false);
  const [loadingSimpan, setLoadingSimpan] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoCsv, setInfoCsv] = useState<string | null>(null);

  useEffect(() => {
    if (!poId || !periode) return;
    let aktif = true;
    setLoadingData(true);
    setError(null);

    fetch(`/api/timesheet?poId=${poId}&periode=${encodeURIComponent(periode)}`)
      .then((r) => r.json())
      .then((d) => {
        if (!aktif) return;
        setLoadingData(false);
        const acuan = Number(d.hariKerjaAcuanBulan) > 0 ? Number(d.hariKerjaAcuanBulan) : 21;
        setWorkdaysGlobal(acuan);
        setKehadiranGlobal(acuan);

        const list: BarisTimesheetPo[] = (d.daftarPersonelPo ?? []).map(
          (p: {
            personelId: number;
            namaPersonel: string;
            nilaiRate: string | null;
            timesheet: {
              totalHariKerja: number;
              totalKehadiran: number;
              tanggalTimesheet: string | null;
              namaFile: string | null;
            } | null;
          }) => ({
            personelId: p.personelId,
            namaPersonel: p.namaPersonel,
            nilaiRate: p.nilaiRate,
            totalHariKerja: p.timesheet?.totalHariKerja ?? acuan,
            totalKehadiran: p.timesheet?.totalKehadiran ?? acuan,
            tanggalTimesheet: p.timesheet?.tanggalTimesheet || hariIni,
            namaFileAda: p.timesheet?.namaFile ?? null,
            dipilih: true,
          })
        );
        setBaris(list);
      })
      .catch(() => {
        if (!aktif) return;
        setLoadingData(false);
        setError("Gagal memuat daftar personel untuk PO ini.");
      });

    return () => {
      aktif = false;
    };
  }, [poId, periode, hariIni]);

  function terapkanKeSemua() {
    setBaris((prev) =>
      prev.map((b) => ({
        ...b,
        totalHariKerja: workdaysGlobal,
        totalKehadiran: kehadiranGlobal,
        tanggalTimesheet: tanggalTimesheetGlobal,
      }))
    );
  }

  async function handlePilihFile(f: File | null) {
    setFile(f);
    setInfoCsv(null);
    if (!f || !f.name.toLowerCase().endsWith(".csv")) return;

    // Jika file adalah CSV, coba baca kolom nama + workdays/attendance untuk auto-fill baris
    try {
      const teks = (await f.text()).replace(/^\uFEFF/, "");
      const semua = parseCsv(teks);
      if (semua.length < 2) return;
      const header = semua[0].map((h) => h.trim().toLowerCase());
      const adaKolomNama = header.some((h) => ["name", "nama", "personel", "talent"].includes(h));
      const adaKolomHari = header.some((h) =>
        ["workdays", "total_hari_kerja", "hari_kerja", "attendance", "total_kehadiran", "kehadiran", "hadir"].includes(h)
      );
      if (!adaKolomNama || !adaKolomHari) return;

      const objek = csvKeObjek([header, ...semua.slice(1)]);
      let terisi = 0;
      setBaris((prev) =>
        prev.map((b) => {
          const cocok = objek.find((r) => {
            const nm = (r.name || r.nama || r.personel || r.talent || "").trim().toLowerCase();
            return nm === b.namaPersonel.trim().toLowerCase();
          });
          if (!cocok) return b;
          const hkRaw = cocok.workdays ?? cocok.total_hari_kerja ?? cocok.hari_kerja;
          const hadirRaw = cocok.attendance ?? cocok.total_kehadiran ?? cocok.kehadiran ?? cocok.hadir ?? hkRaw;
          const hk = hkRaw !== undefined && hkRaw !== "" ? Number(hkRaw) : b.totalHariKerja;
          const hadir = hadirRaw !== undefined && hadirRaw !== "" ? Number(hadirRaw) : b.totalKehadiran;
          if (!isNaN(hk) && !isNaN(hadir)) {
            terisi++;
            return {
              ...b,
              totalHariKerja: hk,
              totalKehadiran: hadir,
              dipilih: true,
            };
          }
          return b;
        })
      );
      if (terisi > 0) {
        setInfoCsv(`Berhasil mencocokkan workdays otomatis untuk ${terisi} personel dari file CSV.`);
      }
    } catch {
      // Abaikan jika CSV adalah dokumen lampiran biasa
    }
  }

  function tambahPersonelKeDaftar() {
    if (!personelTambahId) return;
    const pid = Number(personelTambahId);
    if (baris.some((b) => b.personelId === pid)) {
      setError("Personel tersebut sudah ada di dalam daftar.");
      return;
    }
    const master = daftarPersonelMaster.find((p) => p.id === pid);
    if (!master) return;
    setBaris((prev) => [
      ...prev,
      {
        personelId: master.id,
        namaPersonel: master.nama,
        nilaiRate: master.rateTerakhir,
        totalHariKerja: workdaysGlobal,
        totalKehadiran: kehadiranGlobal,
        tanggalTimesheet: tanggalTimesheetGlobal,
        namaFileAda: null,
        dipilih: true,
      },
    ]);
    setPersonelTambahId("");
    setError(null);
  }

  async function simpanDanHitung() {
    setError(null);
    if (!periode) {
      setError("Pilih Billing Period terlebih dahulu.");
      return;
    }
    const dipilihList = baris.filter((b) => b.dipilih);
    if (dipilihList.length === 0) {
      setError("Pilih minimal 1 personel untuk disimpan timesheet-nya.");
      return;
    }

    for (const b of dipilihList) {
      if (!Number.isInteger(b.totalHariKerja) || b.totalHariKerja <= 0) {
        setError(`Total Working Days untuk ${b.namaPersonel} harus angka bulat > 0.`);
        return;
      }
      if (!Number.isInteger(b.totalKehadiran) || b.totalKehadiran < 0) {
        setError(`Attendance Days untuk ${b.namaPersonel} harus angka bulat >= 0.`);
        return;
      }
      if (b.totalKehadiran > b.totalHariKerja) {
        setError(`Attendance Days (${b.totalKehadiran}) untuk ${b.namaPersonel} tidak boleh melebihi Total Working Days (${b.totalHariKerja}).`);
        return;
      }
    }

    const fd = new FormData();
    fd.append("poId", String(poId));
    fd.append("userXlId", String(userXlId));
    fd.append("periode", periode);
    fd.append("tanggalTimesheet", tanggalTimesheetGlobal);
    if (file) {
      fd.append("file", file);
    }
    fd.append(
      "items",
      JSON.stringify(
        dipilihList.map((b) => ({
          personelId: b.personelId,
          totalHariKerja: b.totalHariKerja,
          totalKehadiran: b.totalKehadiran,
          tanggalTimesheet: b.tanggalTimesheet || tanggalTimesheetGlobal,
        }))
      )
    );

    setLoadingSimpan(true);
    const res = await fetch("/api/timesheet", { method: "POST", body: fd });
    const d = await res.json().catch(() => ({}));
    setLoadingSimpan(false);

    if (!res.ok) {
      setError(d.error ?? "Gagal menyimpan timesheet.");
      return;
    }

    onSelesai(periode);
  }

  const totalEstimasi = baris
    .filter((b) => b.dipilih)
    .reduce((acc, b) => {
      const est = hitungProrataBaris(b.nilaiRate, b.totalKehadiran, b.totalHariKerja);
      return acc + (est ? Number(est) : 0);
    }, 0);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.45)",
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
          width: 820,
          maxWidth: "96vw",
          maxHeight: "92vh",
          overflowY: "auto",
          padding: "20px 24px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 12 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 18 }}>📄 Masukkan Timesheet &amp; Hitung Workdays</h3>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--muted, #64748b)" }}>
              PO: <b>{poLabel}</b> — Masukkan hari kerja (workdays) dan kehadiran dari timesheet. Nilai tagihan akan dihitung otomatis dari workdays timesheet ini.
            </p>
          </div>
          <button
            type="button"
            onClick={onTutup}
            style={{ background: "transparent", border: "none", fontSize: 18, cursor: "pointer", color: "var(--muted, #64748b)" }}
          >
            ✕
          </button>
        </div>

        {/* Pengaturan Global & Upload File */}
        <div
          style={{
            background: "var(--color-bg-alt, #f8fafc)",
            border: "1px solid var(--border, #e2e8f0)",
            borderRadius: 8,
            padding: 14,
            marginBottom: 16,
          }}
        >
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, alignItems: "end" }}>
            <div className="field" style={{ margin: 0 }}>
              <label style={{ fontWeight: 600 }}>Billing Period</label>
              <input
                type="month"
                value={periode}
                onChange={(e) => setPeriode(e.target.value)}
                required
              />
            </div>
            <div className="field" style={{ margin: 0 }}>
              <label style={{ fontWeight: 600 }}>Tanggal Timesheet</label>
              <input
                type="date"
                value={tanggalTimesheetGlobal}
                onChange={(e) => setTanggalTimesheetGlobal(e.target.value)}
              />
            </div>
            <div className="field" style={{ margin: 0 }}>
              <label style={{ fontWeight: 600 }}>Workdays Acuan</label>
              <input
                type="number"
                min={1}
                value={workdaysGlobal}
                onChange={(e) => setWorkdaysGlobal(Number(e.target.value))}
              />
            </div>
            <div className="field" style={{ margin: 0 }}>
              <label style={{ fontWeight: 600 }}>Default Kehadiran</label>
              <input
                type="number"
                min={0}
                value={kehadiranGlobal}
                onChange={(e) => setKehadiranGlobal(Number(e.target.value))}
              />
            </div>
            <div>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ width: "100%", whiteSpace: "nowrap" }}
                onClick={terapkanKeSemua}
              >
                Terapkan ke Semua
              </button>
            </div>
          </div>

          <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 12, flexWrap: "wrap" }}>
            <div className="field" style={{ margin: 0, flex: 1, minWidth: 260 }}>
              <label style={{ fontSize: 12.5 }}>
                Lampiran File Timesheet (PDF / Excel / CSV — Opsional)
              </label>
              <input
                type="file"
                accept=".pdf,.xlsx,.xls,.csv"
                onChange={(e) => handlePilihFile(e.target.files?.[0] ?? null)}
              />
            </div>
          </div>
          {infoCsv && (
            <div className="alert alert-success" style={{ marginTop: 8, marginBottom: 0, fontSize: 12.5 }}>
              {infoCsv}
            </div>
          )}
        </div>

        {/* Tambah personel jika belum terpetakan */}
        <div style={{ display: "flex", gap: 8, alignItems: "flex-end", marginBottom: 12, flexWrap: "wrap" }}>
          <div className="field" style={{ margin: 0, minWidth: 280, flex: 1 }}>
            <label style={{ fontSize: 12.5 }}>Tambah Personel Lain ke PO Ini (Opsional)</label>
            <ComboSelect
              value={personelTambahId}
              onChange={(v) => setPersonelTambahId(v)}
              opsi={daftarPersonelMaster
                .filter((pm) => !baris.some((b) => b.personelId === pm.id))
                .map((pm) => ({
                  value: pm.id,
                  label: pm.nama + (pm.rateTerakhir ? ` — (${formatRupiah(pm.rateTerakhir)})` : ""),
                }))}
              placeholderCari="Cari nama personel..."
              kosongLabel="-- Pilih Personel untuk Ditambahkan --"
            />
          </div>
          <button type="button" className="btn btn-secondary" onClick={tambahPersonelKeDaftar} disabled={!personelTambahId}>
            + Tambah ke Tabel
          </button>
        </div>

        {/* Tabel Input Workdays per Personel */}
        {loadingData ? (
          <p style={{ padding: 20, textAlign: "center", color: "var(--muted)" }}>Memuat daftar personel PO...</p>
        ) : (
          <div className="table-wrap" style={{ marginBottom: 14 }}>
            <table>
              <thead>
                <tr>
                  <th style={{ width: 32 }}>
                    <input
                      type="checkbox"
                      checked={baris.length > 0 && baris.every((b) => b.dipilih)}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setBaris((prev) => prev.map((b) => ({ ...b, dipilih: checked })));
                      }}
                    />
                  </th>
                  <th>Personnel</th>
                  <th>Rate / Month</th>
                  <th style={{ width: 135 }}>Attendance Days (Hadir)</th>
                  <th style={{ width: 135 }}>Total Workdays (Timesheet)</th>
                  <th>Estimated Prorata</th>
                </tr>
              </thead>
              <tbody>
                {baris.map((b, idx) => {
                  const est = hitungProrataBaris(b.nilaiRate, b.totalKehadiran, b.totalHariKerja);
                  return (
                    <tr key={b.personelId} style={{ opacity: b.dipilih ? 1 : 0.55 }}>
                      <td>
                        <input
                          type="checkbox"
                          checked={b.dipilih}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setBaris((prev) =>
                              prev.map((item, i) => (i === idx ? { ...item, dipilih: checked } : item))
                            );
                          }}
                        />
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{b.namaPersonel}</div>
                        {b.namaFileAda && (
                          <div style={{ fontSize: 11, color: "var(--muted, #64748b)" }}>
                            Tersimpan: {b.namaFileAda}
                          </div>
                        )}
                      </td>
                      <td>{formatRupiah(b.nilaiRate)}</td>
                      <td>
                        <input
                          type="number"
                          min={0}
                          value={b.totalKehadiran}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setBaris((prev) =>
                              prev.map((item, i) => (i === idx ? { ...item, totalKehadiran: val, dipilih: true } : item))
                            );
                          }}
                          style={{ width: "100%" }}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          min={1}
                          value={b.totalHariKerja}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setBaris((prev) =>
                              prev.map((item, i) => (i === idx ? { ...item, totalHariKerja: val, dipilih: true } : item))
                            );
                          }}
                          style={{ width: "100%" }}
                        />
                      </td>
                      <td style={{ fontWeight: 600 }}>
                        {est ? formatRupiah(est) : "-"}
                        <div style={{ fontSize: 11, fontWeight: "normal", color: "var(--muted, #64748b)" }}>
                          {b.totalKehadiran} / {b.totalHariKerja} hari
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {baris.length === 0 && (
                  <tr>
                    <td colSpan={6} className="table-empty" style={{ textAlign: "center", padding: 20 }}>
                      Belum ada personel yang terpetakan ke PO ini. Gunakan pilihan &quot;Tambah Personel Lain ke PO Ini&quot; di atas untuk menambahkan personel.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "#f0fdf4",
            border: "1px solid #bbf7d0",
            borderRadius: 6,
            padding: "10px 14px",
            marginBottom: 14,
          }}
        >
          <span style={{ fontSize: 13, color: "#166534" }}>
            Total Estimasi Prorata dari Workdays Timesheet ({baris.filter((b) => b.dipilih).length} personel):
          </span>
          <b style={{ fontSize: 16, color: "#166534" }}>{formatRupiah(totalEstimasi)}</b>
        </div>

        {error && <div className="alert alert-danger" style={{ marginBottom: 12 }}>{error}</div>}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button type="button" className="btn btn-secondary" onClick={onTutup} disabled={loadingSimpan}>
            Batal
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={simpanDanHitung}
            disabled={loadingSimpan || baris.filter((b) => b.dipilih).length === 0}
          >
            {loadingSimpan ? "Menyimpan & Menghitung..." : "Simpan Timesheet & Hitung Prorata"}
          </button>
        </div>
      </div>
    </div>
  );
}
