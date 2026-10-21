import Decimal from "decimal.js";

export type StatusSelisihGr = {
  nilaiPengajuan: string;
  nilaiGrDisetujui: string | null;
  selisih: string | null;
  kategori: "impas" | "kekurangan_gr" | "kelebihan_gr" | "belum_dicatat";
  keterangan: string;
};

/**
 * Evaluasi selisih GR aktual terhadap nilai pengajuan final.
 * Rumus BRD: Selisih = Nilai Pengajuan - Nilai GR Disetujui.
 * Contoh: Diajukan 10.000.000, GR Disetujui 9.999.994 -> Selisih = +6.00 (Kekurangan GR).
 */
export function evaluasiSelisihGr(nilaiPengajuan: string | number, nilaiGrDisetujuiStr: string | null): StatusSelisihGr {
  const pengajuanDec = new Decimal(nilaiPengajuan || 0);

  if (!nilaiGrDisetujuiStr || nilaiGrDisetujuiStr.trim() === "") {
    return {
      nilaiPengajuan: pengajuanDec.toFixed(2),
      nilaiGrDisetujui: null,
      selisih: null,
      kategori: "belum_dicatat",
      keterangan: "Nilai GR disetujui belum dicatat oleh Petugas.",
    };
  }

  const grDec = new Decimal(nilaiGrDisetujuiStr);
  const selisihDec = pengajuanDec.minus(grDec);

  if (selisihDec.equals(0)) {
    return {
      nilaiPengajuan: pengajuanDec.toFixed(2),
      nilaiGrDisetujui: grDec.toFixed(2),
      selisih: "0.00",
      kategori: "impas",
      keterangan: "Nilai GR disetujui sama persis dengan nilai pengajuan (Impas / 100% Match).",
    };
  }

  if (selisihDec.greaterThan(0)) {
    return {
      nilaiPengajuan: pengajuanDec.toFixed(2),
      nilaiGrDisetujui: grDec.toFixed(2),
      selisih: selisihDec.toFixed(2),
      kategori: "kekurangan_gr",
      keterangan: `Kekurangan GR: Rp${Number(selisihDec.toFixed(2)).toLocaleString("id-ID")} akan otomatis ditambahkan ke pengajuan berikutnya.`,
    };
  }

  return {
    nilaiPengajuan: pengajuanDec.toFixed(2),
    nilaiGrDisetujui: grDec.toFixed(2),
    selisih: selisihDec.toFixed(2),
    kategori: "kelebihan_gr",
    keterangan: `Kelebihan GR: Rp${Number(selisihDec.abs().toFixed(2)).toLocaleString("id-ID")} akan otomatis dipotongkan dari pengajuan berikutnya.`,
  };
}

/**
 * Perhitungan PPN dan Total Invoice resmi.
 * Invoice Sebelum PPN WAJIB SAMA PERSIS dengan Nilai GR Disetujui.
 */
export function hitungTotalInvoice(nilaiGrDisetujui: string | number, tarifPpnStr: string | number = "11") {
  const dasarDec = new Decimal(nilaiGrDisetujui || 0);
  const tarifDec = new Decimal(tarifPpnStr || 11).dividedBy(100);
  const ppnDec = dasarDec.times(tarifDec);
  const totalDec = dasarDec.plus(ppnDec);

  return {
    dasarPengenaanPajak: dasarDec.toFixed(2),
    nilaiPpn: ppnDec.toFixed(2),
    totalDenganPpn: totalDec.toFixed(2),
  };
}
