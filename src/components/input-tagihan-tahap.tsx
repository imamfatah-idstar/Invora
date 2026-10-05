"use client";

// Input nilai tagihan MANUAL untuk PO jenisTagihan="tahap" (bagian 53, keputusan
// bagian 41): Petugas mengetik nominal per personel + keterangan tahap. Personel
// yang nilainya dikosongkan tidak ikut ditagihkan di pengajuan ini.
export type BarisTahapUi = {
  personelId: number;
  namaPersonel: string;
  nilaiRateAcuan: string | null;
};

function formatRupiah(nilai: string) {
  return "Rp" + Number(nilai).toLocaleString("id-ID", { minimumFractionDigits: 2 });
}

export function totalNilaiTahap(nilai: Record<number, string>): number {
  return Object.values(nilai).reduce((acc, v) => acc + (Number(v) > 0 ? Number(v) : 0), 0);
}

export function nilaiManualTerisi(nilai: Record<number, string>): Record<number, string> {
  const hasil: Record<number, string> = {};
  for (const [k, v] of Object.entries(nilai)) {
    if (v && v.trim() !== "") hasil[Number(k)] = v.trim();
  }
  return hasil;
}

export default function InputTagihanTahap({
  baris, nilai, onNilai, keterangan, onKeterangan,
}: {
  baris: BarisTahapUi[];
  nilai: Record<number, string>;
  onNilai: (personelId: number, v: string) => void;
  keterangan: string;
  onKeterangan: (v: string) => void;
}) {
  return (
    <div>
      <div className="alert alert-warning">
        PO ini bertipe <b>tagihan tahap</b> — nilai tidak dihitung otomatis. Isi nominal tagihan tiap personel
        untuk tahap ini (kosongkan kalau personel tidak ditagihkan di pengajuan ini).
      </div>
      <div className="toolbar">
        <div className="field" style={{ minWidth: 280 }}>
          <label>Keterangan tahap</label>
          <input
            value={keterangan}
            onChange={(e) => onKeterangan(e.target.value)}
            placeholder='cth. "Tahap I (50%)"'
          />
        </div>
      </div>
      <div className="table-wrap">
        <table>
          <thead><tr>
            <th>Personel</th><th>Rate card (acuan)</th><th>Nilai tagihan tahap ini (Rp, sebelum PPN)</th>
          </tr></thead>
          <tbody>
            {baris.map((b) => (
              <tr key={b.personelId}>
                <td>{b.namaPersonel}</td>
                <td>{b.nilaiRateAcuan ? formatRupiah(b.nilaiRateAcuan) : "-"}</td>
                <td>
                  <input
                    inputMode="decimal"
                    placeholder="cth 25000000.00"
                    value={nilai[b.personelId] ?? ""}
                    onChange={(e) => onNilai(b.personelId, e.target.value)}
                  />
                </td>
              </tr>
            ))}
            {baris.length === 0 && (
              <tr><td colSpan={3} className="table-empty">Tidak ada personel terpetakan ke PO ini untuk periode tersebut.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="card" style={{ display: "inline-block", padding: "10px 16px", fontSize: 15 }}>
        Total tahap ini: <b>{formatRupiah(String(totalNilaiTahap(nilai)))}</b>
      </p>
    </div>
  );
}
