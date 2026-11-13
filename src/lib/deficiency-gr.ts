import Decimal from "decimal.js";

export type StatusSelisihGr = {
  nilaiPengajuan: string;
  nilaiGrDisetujui: string | null;
  selisih: string | null;
  /** Nilai absolut selisih (selalu positif), mis. "6.00" */
  nominalSelisih: string;
  /** Persentase GR disetujui terhadap nilai pengajuan, mis. "99.99" */
  persentase: string;
  kategori: "impas" | "kekurangan_gr" | "kelebihan_gr" | "belum_dicatat";
  keterangan: string;
};

/**
 * Parse angka secara aman dari input user. Mendukung format:
 * "10000000", "10000000.00", "10.000.000", "10.000.000,00", "Rp 10.000.000", "10,000,000.00".
 * Mengembalikan null jika tidak valid (tidak pernah melempar error).
 */
export function parseAngkaAman(input: string | number | null | undefined): Decimal | null {
  if (input === null || input === undefined) return null;
  if (typeof input === "number") return Number.isFinite(input) ? new Decimal(input) : null;
  let s = String(input).trim().replace(/rp/gi, "").replace(/\s/g, "");
  if (!s) return null;

  const adaTitik = s.includes(".");
  const adaKoma = s.includes(",");
  if (adaTitik && adaKoma) {
    // Pemisah desimal = yang muncul paling akhir
    if (s.lastIndexOf(",") > s.lastIndexOf(".")) s = s.replace(/\./g, "").replace(",", ".");
    else s = s.replace(/,/g, "");
  } else if (adaKoma) {
    // "10,5" -> desimal; "10,000,000" -> ribuan
    s = /^\d{1,3}(,\d{3})+$/.test(s) ? s.replace(/,/g, "") : s.replace(",", ".");
  } else if (adaTitik && /^\d{1,3}(\.\d{3}){2,}$/.test(s)) {
    // "10.000.000" -> ribuan (format Indonesia)
    s = s.replace(/\./g, "");
  }

  if (!/^-?\d+(\.\d+)?$/.test(s)) return null;
  try {
    return new Decimal(s);
  } catch {
    return null;
  }
}

/**
 * Evaluasi selisih GR aktual terhadap nilai pengajuan final.
 * Rumus BRD: Selisih = Nilai Pengajuan - Nilai GR Disetujui.
 * Contoh: Diajukan 10.000.000, GR Disetujui 9.999.994 -> Selisih = +6.00 (Kekurangan GR).
 */
export function evaluasiSelisihGr(nilaiPengajuan: string | number, nilaiGrDisetujuiStr: string | null): StatusSelisihGr {
  const pengajuanDec = parseAngkaAman(nilaiPengajuan) ?? new Decimal(0);
  const grDec = parseAngkaAman(nilaiGrDisetujuiStr);

  if (!grDec) {
    return {
      nilaiPengajuan: pengajuanDec.toFixed(2),
      nilaiGrDisetujui: null,
      selisih: null,
      nominalSelisih: "0.00",
      persentase: "0.00",
      kategori: "belum_dicatat",
      keterangan: "Approved GR value has not been recorded yet.",
    };
  }

  const selisihDec = pengajuanDec.minus(grDec);
  const persentase = pengajuanDec.isZero() ? "0.00" : grDec.dividedBy(pengajuanDec).times(100).toFixed(2);
  const base = {
    nilaiPengajuan: pengajuanDec.toFixed(2),
    nilaiGrDisetujui: grDec.toFixed(2),
    selisih: selisihDec.toFixed(2),
    nominalSelisih: selisihDec.abs().toFixed(2),
    persentase,
  };

  if (selisihDec.equals(0)) {
    return {
      ...base,
      selisih: "0.00",
      kategori: "impas",
      keterangan: "Approved GR matches submission amount exactly (Balanced / 100% Match).",
    };
  }

  if (selisihDec.greaterThan(0)) {
    return {
      ...base,
      kategori: "kekurangan_gr",
      keterangan: `GR Under-delivery: Rp${Number(selisihDec.toFixed(2)).toLocaleString("id-ID")} will be automatically added to the next submission.`,
    };
  }

  return {
    ...base,
    kategori: "kelebihan_gr",
    keterangan: `GR Surplus: Rp${Number(selisihDec.abs().toFixed(2)).toLocaleString("id-ID")} will be automatically deducted from the next submission.`,
  };
}

/**
 * Perhitungan PPN dan Total Invoice resmi.
 * Invoice Sebelum PPN WAJIB SAMA PERSIS dengan Nilai GR Disetujui.
 */
export function hitungTotalInvoice(nilaiGrDisetujui: string | number, tarifPpnStr: string | number = "11") {
  const dasarDec = parseAngkaAman(nilaiGrDisetujui) ?? new Decimal(0);
  const tarifDec = (parseAngkaAman(tarifPpnStr) ?? new Decimal(11)).dividedBy(100);
  const ppnDec = dasarDec.times(tarifDec);
  const totalDec = dasarDec.plus(ppnDec);

  return {
    dasarPengenaanPajak: dasarDec.toFixed(2),
    nilaiPpn: ppnDec.toFixed(2),
    totalDenganPpn: totalDec.toFixed(2),
  };
}
