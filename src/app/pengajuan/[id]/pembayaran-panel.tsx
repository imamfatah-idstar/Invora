"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatRupiah } from "@/lib/aging";
import Decimal from "decimal.js";

type PembayaranItem = {
  id: number;
  tanggalBayar: string;
  nominalDiterima: string;
  potonganPph23: string;
  nomorBupotPph23: string | null;
  biayaAdminBank: string;
  bankTujuan: string;
  nomorReferensiBank: string | null;
  namaFileBukti: string | null;
  pathFileBukti: string | null;
  status: string; // "menunggu_verifikasi" | "diverifikasi" | "ditolak"
  catatan: string | null;
  diinputPada: string;
  diinputOlehUserId: number;
  namaPenginput: string;
  diverifikasiPada: string | null;
  catatanChecker: string | null;
};

type Props = {
  pengajuanId: number;
  nomorInvoice: string | null;
  totalInvoice: number;
  dpp: number;
  daftarPembayaranAwal: PembayaranItem[];
  userLogin: { id: number; nama: string; role: string };
};

const BANK_PILIHAN = [
  "BCA — PT IDStar Cipta Teknologi (Rek: 001-238-991)",
  "Bank Mandiri — PT IDStar Cipta Teknologi (Rek: 132-00-19283-1)",
  "Bank BRI — PT IDStar Cipta Teknologi (Rek: 0192-01-002931-50-1)",
  "Bank BNI — PT IDStar Cipta Teknologi (Rek: 981-229-3011)",
  "Lainnya",
];

export default function PembayaranPanel({
  pengajuanId,
  nomorInvoice,
  totalInvoice,
  dpp,
  daftarPembayaranAwal,
  userLogin,
}: Props) {
  const router = useRouter();
  const [daftar, setDaftar] = useState<PembayaranItem[]>(daftarPembayaranAwal);
  const [bukaForm, setBukaForm] = useState(false);

  // Form State
  const [tanggalBayar, setTanggalBayar] = useState(new Date().toISOString().split("T")[0]);
  const [nominalDiterima, setNominalDiterima] = useState("");
  const [potonganPph23, setPotonganPph23] = useState("");
  const [nomorBupotPph23, setNomorBupotPph23] = useState("");
  const [biayaAdminBank, setBiayaAdminBank] = useState("0");
  const [bankTujuan, setBankTujuan] = useState(BANK_PILIHAN[0]);
  const [nomorReferensiBank, setNomorReferensiBank] = useState("");
  const [catatan, setCatatan] = useState("");
  const [fileBukti, setFileBukti] = useState<File | null>(null);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [suksesMsg, setSuksesMsg] = useState<string | null>(null);

  // Verifikasi Modal/State
  const [verifikasiLoadingId, setVerifikasiLoadingId] = useState<number | null>(null);

  // Hitung total terbayar yang SUDAH diverifikasi
  const pembayaranDiverifikasi = daftar.filter((p) => p.status === "diverifikasi");
  const totalTerbayar = pembayaranDiverifikasi.reduce((acc, p) => {
    const nominal = new Decimal(p.nominalDiterima || 0);
    const pph = new Decimal(p.potonganPph23 || 0);
    const admin = new Decimal(p.biayaAdminBank || 0);
    return acc.plus(nominal).plus(pph).plus(admin);
  }, new Decimal(0)).toNumber();

  const sisaPiutang = Math.max(0, new Decimal(totalInvoice).minus(totalTerbayar).toNumber());

  // Status Lunas / Sebagian / Belum
  const statusPelunasan =
    sisaPiutang <= 0
      ? "Paid in Full"
      : totalTerbayar > 0
      ? "Partially Paid"
      : "Unpaid";

  // Auto hitung PPh 23 (2% dari DPP)
  function hitungOtomatisPph23() {
    const pph23 = new Decimal(dpp).times(0.02).toDecimalPlaces(0).toString();
    setPotonganPph23(pph23);
    // Jika nominal diterima masih kosong, perkirakan sisa piutang dikurangi PPh 23
    if (!nominalDiterima && sisaPiutang > 0) {
      const estimasiNet = Math.max(0, new Decimal(sisaPiutang).minus(pph23).toNumber());
      setNominalDiterima(estimasiNet.toString());
    }
  }

  async function handleSimpanPembayaran(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setSuksesMsg(null);
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("tanggalBayar", tanggalBayar);
      formData.append("nominalDiterima", nominalDiterima);
      formData.append("potonganPph23", potonganPph23 || "0");
      formData.append("nomorBupotPph23", nomorBupotPph23);
      formData.append("biayaAdminBank", biayaAdminBank || "0");
      formData.append("bankTujuan", bankTujuan);
      formData.append("nomorReferensiBank", nomorReferensiBank);
      formData.append("catatan", catatan);
      if (fileBukti) {
        formData.append("fileBukti", fileBukti);
      }

      const res = await fetch(`/api/pengajuan/${pengajuanId}/pembayaran`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to record payment.");
      }

      setSuksesMsg("Payment successfully recorded! Awaiting Checker verification.");
      // Refresh list
      const resDaftar = await fetch(`/api/pengajuan/${pengajuanId}/pembayaran`);
      const dataDaftar = await resDaftar.json();
      if (dataDaftar.pembayaran) {
        setDaftar(dataDaftar.pembayaran);
      }

      // Reset form
      setBukaForm(false);
      setNominalDiterima("");
      setPotonganPph23("");
      setNomorBupotPph23("");
      setNomorReferensiBank("");
      setCatatan("");
      setFileBukti(null);
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message || "An error occurred.");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifikasi(pembayaranId: number, statusHasil: "diverifikasi" | "ditolak") {
    let catatanChecker = "";
    if (statusHasil === "ditolak") {
      const inputCatatan = prompt("Enter reason for rejecting this payment:");
      if (!inputCatatan || !inputCatatan.trim()) return;
      catatanChecker = inputCatatan.trim();
    }

    setVerifikasiLoadingId(pembayaranId);
    setErrorMsg(null);

    try {
      const res = await fetch(`/api/pengajuan/${pengajuanId}/pembayaran/${pembayaranId}/verifikasi`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: statusHasil, catatanChecker }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to process verification.");
      }

      // Refresh data
      const resDaftar = await fetch(`/api/pengajuan/${pengajuanId}/pembayaran`);
      const dataDaftar = await resDaftar.json();
      if (dataDaftar.pembayaran) {
        setDaftar(dataDaftar.pembayaran);
      }
      router.refresh();
    } catch (err: any) {
      alert(`Warning: ${err.message}`);
    } finally {
      setVerifikasiLoadingId(null);
    }
  }

  return (
    <div className="card" style={{ marginTop: 24, padding: "22px 24px" }}>
      {/* Header Panel */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 20 }}>💰</span>
            <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>
              Payment Settlement &amp; Reconciliation
            </h3>
            <span
              style={{
                fontSize: 12,
                fontWeight: 700,
                padding: "3px 8px",
                borderRadius: 6,
                background:
                  statusPelunasan === "Paid in Full"
                    ? "#d1fae5"
                    : statusPelunasan === "Partially Paid"
                    ? "#fef08a"
                    : "#fee2e2",
                color:
                  statusPelunasan === "Paid in Full"
                    ? "#065f46"
                    : statusPelunasan === "Partially Paid"
                    ? "#854d0e"
                    : "#991b1b",
              }}
            >
              Status: {statusPelunasan}
            </span>
          </div>
          <p className="subtitle" style={{ margin: "4px 0 0", fontSize: 13 }}>
            Recording bank transfer mutations, withholding tax PPh 23, withholding tax slips, and Maker-Checker verification.
          </p>
        </div>

        {/* Tombol Aksi Tambah Pembayaran */}
        {(userLogin.role === "petugas" || userLogin.role === "admin") && !bukaForm && sisaPiutang > 0 && (
          <button
            type="button"
            onClick={() => setBukaForm(true)}
            className="btn btn-primary"
            style={{ fontSize: 13, fontWeight: 600, padding: "7px 14px" }}
          >
            + Record New Payment
          </button>
        )}
      </div>

      {/* Ringkasan Finansial Pelunasan */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 14,
          marginTop: 18,
          padding: 14,
          borderRadius: 8,
          background: "var(--color-bg)",
          border: "1px solid var(--color-border)",
        }}
      >
        <div>
          <span style={{ fontSize: 12, color: "var(--color-text-muted)", display: "block" }}>Total Invoice Amount (+VAT)</span>
          <b style={{ fontSize: 16, color: "#111827" }}>{formatRupiah(totalInvoice)}</b>
        </div>
        <div>
          <span style={{ fontSize: 12, color: "var(--color-text-muted)", display: "block" }}>Verified Funds Received</span>
          <b style={{ fontSize: 16, color: "#059669" }}>{formatRupiah(totalTerbayar)}</b>
        </div>
        <div>
          <span style={{ fontSize: 12, color: "var(--color-text-muted)", display: "block" }}>Outstanding Receivables</span>
          <b style={{ fontSize: 16, color: sisaPiutang > 0 ? "#dc2626" : "#059669" }}>
            {formatRupiah(sisaPiutang)}
          </b>
        </div>
      </div>

      {suksesMsg && (
        <div className="alert alert-success" style={{ marginTop: 14 }}>
          ✓ {suksesMsg}
        </div>
      )}

      {errorMsg && (
        <div className="alert alert-danger" style={{ marginTop: 14 }}>
          ⚠️ {errorMsg}
        </div>
      )}

      {/* Form Input Pembayaran Baru */}
      {bukaForm && (
        <form
          onSubmit={handleSimpanPembayaran}
          style={{
            marginTop: 18,
            padding: 18,
            borderRadius: 8,
            background: "#f8fafc",
            border: "1.5px dashed #94a3b8",
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#1e293b" }}>
              Incoming Payment Record Form (Maker / Data Entry)
            </h4>
            <button
              type="button"
              onClick={() => setBukaForm(false)}
              className="btn"
              style={{ fontSize: 12, padding: "4px 8px" }}
            >
              Cancel
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
            {/* Tanggal Bayar */}
            <div>
              <label style={{ fontSize: 12.5, fontWeight: 600, display: "block", marginBottom: 4 }}>
                Payment / Mutation Date <span style={{ color: "red" }}>*</span>
              </label>
              <input
                type="date"
                required
                value={tanggalBayar}
                onChange={(e) => setTanggalBayar(e.target.value)}
                style={{ width: "100%", padding: "7px 10px", borderRadius: 6, border: "1px solid var(--color-border)" }}
              />
            </div>

            {/* Nominal Diterima Bersih */}
            <div>
              <label style={{ fontSize: 12.5, fontWeight: 600, display: "block", marginBottom: 4 }}>
                Net Received Amount (Rp) <span style={{ color: "red" }}>*</span>
              </label>
              <input
                type="number"
                step="any"
                required
                placeholder="e.g. 81900000"
                value={nominalDiterima}
                onChange={(e) => setNominalDiterima(e.target.value)}
                style={{ width: "100%", padding: "7px 10px", borderRadius: 6, border: "1px solid var(--color-border)" }}
              />
            </div>

            {/* Potongan PPh 23 */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <label style={{ fontSize: 12.5, fontWeight: 600 }}>Withholding Tax PPh 23 (Rp)</label>
                <button
                  type="button"
                  onClick={hitungOtomatisPph23}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--color-primary)",
                    fontSize: 11.5,
                    cursor: "pointer",
                    textDecoration: "underline",
                    padding: 0,
                  }}
                >
                  Calculate 2% DPP
                </button>
              </div>
              <input
                type="number"
                step="any"
                placeholder="e.g. 1650000"
                value={potonganPph23}
                onChange={(e) => setPotonganPph23(e.target.value)}
                style={{ width: "100%", padding: "7px 10px", borderRadius: 6, border: "1px solid var(--color-border)" }}
              />
            </div>

            {/* Nomor Bukti Potong PPh 23 */}
            <div>
              <label style={{ fontSize: 12.5, fontWeight: 600, display: "block", marginBottom: 4 }}>
                Tax Withholding Slip No. (Bupot PPh 23)
              </label>
              <input
                type="text"
                placeholder="e.g. BUPOT-2026-09-0012"
                value={nomorBupotPph23}
                onChange={(e) => setNomorBupotPph23(e.target.value)}
                style={{ width: "100%", padding: "7px 10px", borderRadius: 6, border: "1px solid var(--color-border)" }}
              />
            </div>

            {/* Biaya Admin Bank */}
            <div>
              <label style={{ fontSize: 12.5, fontWeight: 600, display: "block", marginBottom: 4 }}>
                Bank Admin / Clearing Fee (Rp)
              </label>
              <input
                type="number"
                step="any"
                placeholder="e.g. 6500"
                value={biayaAdminBank}
                onChange={(e) => setBiayaAdminBank(e.target.value)}
                style={{ width: "100%", padding: "7px 10px", borderRadius: 6, border: "1px solid var(--color-border)" }}
              />
            </div>

            {/* Rekening Bank Tujuan */}
            <div>
              <label style={{ fontSize: 12.5, fontWeight: 600, display: "block", marginBottom: 4 }}>
                Receiving Bank Account <span style={{ color: "red" }}>*</span>
              </label>
              <select
                value={bankTujuan}
                onChange={(e) => setBankTujuan(e.target.value)}
                style={{ width: "100%", padding: "7px 10px", borderRadius: 6, border: "1px solid var(--color-border)" }}
              >
                {BANK_PILIHAN.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>

            {/* No Referensi Bank */}
            <div>
              <label style={{ fontSize: 12.5, fontWeight: 600, display: "block", marginBottom: 4 }}>
                Transaction Reference Number
              </label>
              <input
                type="text"
                placeholder="e.g. TRF-BCA-98102941"
                value={nomorReferensiBank}
                onChange={(e) => setNomorReferensiBank(e.target.value)}
                style={{ width: "100%", padding: "7px 10px", borderRadius: 6, border: "1px solid var(--color-border)" }}
              />
            </div>

            {/* File Bukti Transfer */}
            <div>
              <label style={{ fontSize: 12.5, fontWeight: 600, display: "block", marginBottom: 4 }}>
                Upload Transfer Receipt / Bank Statement
              </label>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => setFileBukti(e.target.files?.[0] || null)}
                style={{ fontSize: 12 }}
              />
            </div>
          </div>

          {/* Catatan */}
          <div>
            <label style={{ fontSize: 12.5, fontWeight: 600, display: "block", marginBottom: 4 }}>
              Payment Notes
            </label>
            <input
              type="text"
              placeholder="Installment notes / special remarks..."
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              style={{ width: "100%", padding: "7px 10px", borderRadius: 6, border: "1px solid var(--color-border)" }}
            />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 6 }}>
            <button
              type="button"
              onClick={() => setBukaForm(false)}
              className="btn"
              style={{ fontSize: 13 }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{ fontSize: 13, fontWeight: 600 }}
            >
              {loading ? "Saving..." : "Save Payment Record"}
            </button>
          </div>
        </form>
      )}

      {/* Tabel Riwayat Pembayaran */}
      <div className="table-wrap" style={{ marginTop: 16 }}>
        <table>
          <thead>
            <tr>
              <th>Payment Date</th>
              <th style={{ textAlign: "right" }}>Net Received</th>
              <th style={{ textAlign: "right" }}>PPh 23</th>
              <th style={{ textAlign: "right" }}>Total Settlement</th>
              <th>Bank &amp; Ref</th>
              <th>Payment Receipt</th>
              <th>Status</th>
              <th>Recorded By</th>
              <th>Checker Action</th>
            </tr>
          </thead>
          <tbody>
            {daftar.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ textAlign: "center", padding: "24px 16px", color: "var(--color-text-muted)" }}>
                  No payment settlement recorded for this invoice yet.
                </td>
              </tr>
            ) : (
              daftar.map((p) => {
                const totalPelunasanBaris = new Decimal(p.nominalDiterima || 0)
                  .plus(new Decimal(p.potonganPph23 || 0))
                  .plus(new Decimal(p.biayaAdminBank || 0))
                  .toNumber();

                const isMenunggu = p.status === "menunggu_verifikasi";
                const isDiverifikasi = p.status === "diverifikasi";
                const isDitolak = p.status === "ditolak";

                const isSayaPembuat = p.diinputOlehUserId === userLogin.id;
                const canCheck = (userLogin.role === "checker" || userLogin.role === "admin") && isMenunggu;

                return (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 600 }}>{p.tanggalBayar}</td>
                    <td style={{ textAlign: "right", fontFamily: "var(--font-mono, monospace)" }}>
                      {formatRupiah(p.nominalDiterima)}
                    </td>
                    <td style={{ textAlign: "right", fontFamily: "var(--font-mono, monospace)", fontSize: 12 }}>
                      {formatRupiah(p.potonganPph23)}
                      {p.nomorBupotPph23 && (
                        <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>
                          No: {p.nomorBupotPph23}
                        </div>
                      )}
                    </td>
                    <td style={{ textAlign: "right", fontWeight: 700, fontFamily: "var(--font-mono, monospace)", color: "#065f46" }}>
                      {formatRupiah(totalPelunasanBaris)}
                    </td>
                    <td>
                      <div style={{ fontSize: 12, fontWeight: 600 }}>{p.bankTujuan}</div>
                      {p.nomorReferensiBank && (
                        <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>
                          Ref: {p.nomorReferensiBank}
                        </div>
                      )}
                    </td>
                    <td>
                      {p.namaFileBukti ? (
                        <span style={{ fontSize: 12, color: "var(--color-primary)", textDecoration: "underline" }} title={p.pathFileBukti || ""}>
                          📄 {p.namaFileBukti}
                        </span>
                      ) : (
                        <span style={{ fontSize: 11.5, color: "#9ca3af" }}>No file</span>
                      )}
                    </td>
                    <td>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "3px 8px",
                          borderRadius: 6,
                          fontSize: 11,
                          fontWeight: 700,
                          background: isDiverifikasi ? "#d1fae5" : isDitolak ? "#fee2e2" : "#fef08a",
                          color: isDiverifikasi ? "#065f46" : isDitolak ? "#991b1b" : "#854d0e",
                        }}
                      >
                        {isDiverifikasi ? "Verified ✓" : isDitolak ? "Rejected ✗" : "Pending Checker"}
                      </span>
                      {p.catatanChecker && (
                        <div style={{ fontSize: 11, color: "#991b1b", marginTop: 2 }}>
                          Reason: {p.catatanChecker}
                        </div>
                      )}
                    </td>
                    <td style={{ fontSize: 12 }}>
                      <div>{p.namaPenginput}</div>
                      <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>{p.diinputPada.split("T")[0]}</div>
                    </td>
                    <td>
                      {canCheck ? (
                        isSayaPembuat ? (
                          <span style={{ fontSize: 11, color: "#9ca3af", fontStyle: "italic" }} title="Segregation of Duties">
                            Creator restricted from verifying
                          </span>
                        ) : (
                          <div style={{ display: "flex", gap: 6 }}>
                            <button
                              type="button"
                              disabled={verifikasiLoadingId === p.id}
                              onClick={() => handleVerifikasi(p.id, "diverifikasi")}
                              className="btn"
                              style={{
                                padding: "4px 8px",
                                fontSize: 11,
                                fontWeight: 700,
                                background: "#10b981",
                                color: "#fff",
                                border: "none",
                              }}
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              disabled={verifikasiLoadingId === p.id}
                              onClick={() => handleVerifikasi(p.id, "ditolak")}
                              className="btn"
                              style={{
                                padding: "4px 8px",
                                fontSize: 11,
                                fontWeight: 700,
                                background: "#ef4444",
                                color: "#fff",
                                border: "none",
                              }}
                            >
                              Reject
                            </button>
                          </div>
                        )
                      ) : (
                        <span style={{ fontSize: 11.5, color: "var(--color-text-muted)" }}>
                          {isDiverifikasi ? `Verified (${p.diverifikasiPada || "-"})` : "-"}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
