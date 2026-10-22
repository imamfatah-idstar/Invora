import { formatRupiah } from "./aging";

export type ReminderType = "h-7" | "h-0" | "h+7" | "h+14" | "h+30" | "custom";

export interface ReminderEmailPayload {
  tipe: ReminderType;
  namaPic: string;
  emailPic: string;
  klien: string;
  nomorInvoice: string;
  nomorFakturPajak?: string | null;
  nomorPo: string;
  namaProyek: string;
  periode: string;
  tanggalInvoice: string;
  tanggalJatuhTempo: string;
  hariTerlambat: number; // negatif = masih H minus, positif = overdue
  totalTagihan: number;
  terbayar: number;
  sisaPiutang: number;
  pengirimNama?: string;
  pengirimRole?: string;
}

export const REKENING_PEMBAYARAN = [
  {
    bank: "Bank Central Asia (BCA)",
    cabang: "KCU Mega Kuningan Jakarta",
    nomorRekening: "541-098-7711",
    atasNama: "PT IDSTAR CIPTA TEKNOLOGI",
  },
  {
    bank: "Bank Mandiri",
    cabang: "KC Jakarta Bellagio Mansion",
    nomorRekening: "124-00-1122334-9",
    atasNama: "PT IDSTAR CIPTA TEKNOLOGI",
  },
];

/**
 * Ekstrak alamat email dari string kontak PIC (cth: "hendra@xl.co.id / +62818...")
 */
export function extractEmailFromKontak(kontak?: string | null): string {
  if (!kontak) return "";
  const match = kontak.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/);
  return match ? match[1] : "";
}

/**
 * Menentukan tipe reminder yang direkomendasikan berdasarkan umur hari menuju jatuh tempo
 */
export function rekomendasiTipeReminder(hariTerlambat: number): ReminderType {
  if (hariTerlambat < -3) {
    return "h-7";
  } else if (hariTerlambat <= 1) {
    return "h-0";
  } else if (hariTerlambat <= 10) {
    return "h+7";
  } else if (hariTerlambat <= 25) {
    return "h+14";
  } else {
    return "h+30";
  }
}

/**
 * Generator template email pengingat jatuh tempo
 */
export function generateEmailReminder(p: ReminderEmailPayload): {
  subjek: string;
  pesanTeks: string;
  mailtoUrl: string;
} {
  const sisaFormatted = formatRupiah(p.sisaPiutang);
  const totalFormatted = formatRupiah(p.totalTagihan);
  const fpText = p.nomorFakturPajak ? ` (Faktur Pajak: ${p.nomorFakturPajak})` : "";
  const picGreeting = p.namaPic ? `Bapak/Ibu ${p.namaPic}` : "Bapak/Ibu Tim Finance / Procurement";

  let subjek = "";
  let intro = "";
  let closing = "";
  let toneBadge = "";

  switch (p.tipe) {
    case "h-7":
      toneBadge = "Pemberitahuan Awal (H-7)";
      subjek = `[Pemberitahuan] Pengingat Jatuh Tempo Invoice ${p.nomorInvoice} - PT IDStar Cipta Teknologi`;
      intro = `Semoga Bapak/Ibu senantiasa dalam keadaan sehat dan sukses.\n\nMelalui surel ini, kami dari Tim Finance & Invoicing PT IDStar Cipta Teknologi bermaksud menginformasikan bahwa tagihan invoice layanan profesional talenta untuk proyek "${p.namaProyek}" akan memasuki tanggal jatuh tempo dalam 7 hari ke depan, yaitu pada ${p.tanggalJatuhTempo}.`;
      closing = `Mohon konfirmasi apabila berkas penagihan telah lengkap dan proses pembayaran telah dijadwalkan dalam siklus pencairan keuangan ${p.klien}.\n\nApabila membutuhkan klarifikasi atau dokumen pendukung tambahan (Timesheet/BAST/Faktur Pajak), kami siap membantu dengan senang hati.`;
      break;

    case "h-0":
      toneBadge = "Hari Jatuh Tempo (H-0)";
      subjek = `[Jatuh Tempo Hari Ini] Invoice ${p.nomorInvoice} - PT IDStar Cipta Teknologi (${p.klien})`;
      intro = `Salam hangat dari PT IDStar Cipta Teknologi.\n\nKami menginformasikan bahwa tagihan invoice ${p.nomorInvoice} atas pekerjaan "${p.namaProyek}" telah jatuh tempo pada hari ini, ${p.tanggalJatuhTempo}.\n\nTotal nilai tagihan yang perlu diselesaikan adalah sebesar ${sisaFormatted}.`;
      closing = `Mohon bantuan Bapak/Ibu untuk memeriksa status proses pencairan dana tersebut pada bagian Treasury / Finance ${p.klien}.\n\nApabila pembayaran telah ditransfer pada hari ini, mohon kesediaan Bapak/Ibu mengirimkan bukti transfer (slip setoran/rekening koran) sebagai kelengkapan rekonsiliasi pembayaran kami.`;
      break;

    case "h+7":
      toneBadge = "Follow-Up Keterlambatan (H+7)";
      subjek = `[Konfirmasi Pembayaran] Invoice ${p.nomorInvoice} Melewati Jatuh Tempo (+${p.hariTerlambat} Hari) - ${p.klien}`;
      intro = `Dengan hormat,\n\nMenindaklanjuti invoice kami nomor ${p.nomorInvoice} yang telah jatuh tempo pada tanggal ${p.tanggalJatuhTempo} (telah melewati jatuh tempo sekitar ${p.hariTerlambat} hari kerja).\n\nHingga saat ini, sistem kami belum mencatat konfirmasi penerimaan pelunasan piutang atas invoice tersebut dengan sisa sebesar ${sisaFormatted}.`;
      closing = `Kami sangat mengharapkan informasi atau estimasi tanggal realisasi pembayaran dari Bapak/Ibu. Jika terdapat kendala administratif ataupun proses kliring antar-bank, mohon kesediaan Bapak/Ibu untuk mengabarkan kepada kami agar dapat kami tindak lanjuti bersama.`;
      break;

    case "h+14":
      toneBadge = "Peringatan Pembayaran (H+14)";
      subjek = `[PERINGATAN PEMBAYARAN TAHAP II] Invoice ${p.nomorInvoice} Menunggak 14 Hari - PT IDStar Cipta Teknologi`;
      intro = `Dengan hormat,\n\nMerujuk pada catatan finansial kami, invoice nomor ${p.nomorInvoice} untuk proyek "${p.namaProyek}" telah melewati tanggal jatuh tempo (${p.tanggalJatuhTempo}) selama 14 hari dengan saldo terutang sebesar ${sisaFormatted}.\n\nMengingat layanan operasional penempatan talenta IT telah berjalan sesuai SLA kontrak kerja, kami memohon prioritas Bapak/Ibu untuk memproses pembayaran invoice ini.`;
      closing = `Besar harapan kami agar pembayaran dapat diselesaikan dalam minggu ini. Mohon segera kirimkan bukti transfer pelunasan begitu dana telah didebet dari rekening perusahaan Bapak/Ibu. Atas perhatian dan kerja sama baiknya, kami ucapkan terima kasih.`;
      break;

    case "h+30":
      toneBadge = "Surat Pemberitahuan Tunggakan Kritis (H+30)";
      subjek = `[SURAT PEMBERITAHUAN TUNGGAKAN] Invoice ${p.nomorInvoice} Menunggak >30 Hari - ${p.klien}`;
      intro = `Kepada Yth. Manajemen & Tim Keuangan ${p.klien},\n\nDengan hormat,\n\nKami menyampaikan surat pemberitahuan resmi terkait invoice ${p.nomorInvoice} yang telah melewati batas waktu pembayaran selama lebih dari 30 hari (${p.hariTerlambat} hari kalender) dengan nilai tunggakan sebesar ${sisaFormatted}.\n\nKeterlambatan ini telah berdampak signifikan pada arus kas operasional penggajian talenta yang bertugas di lokasi ${p.klien}.`;
      closing = `Melalui surat ini, kami memohon agar kewajiban pembayaran invoice tersebut dapat segera diselesaikan dalam tempo selambat-lambatnya 3 (tiga) hari kerja sejak surat ini diterima.\n\nDemikian pemberitahuan ini kami sampaikan dengan harapan kemitraan bisnis yang saling mendukung dan berkelanjutan. Terima kasih.`;
      break;

    default:
      toneBadge = "Pengingat Pembayaran Khusus";
      subjek = `[Pengingat Pembayaran] Invoice ${p.nomorInvoice} - PT IDStar Cipta Teknologi`;
      intro = `Dengan hormat ${picGreeting},\n\nBerikut kami sampaikan pengingat terkait invoice ${p.nomorInvoice} dengan sisa tagihan sebesar ${sisaFormatted} yang memiliki tanggal jatuh tempo pada ${p.tanggalJatuhTempo}.`;
      closing = `Mohon konfirmasi status proses pembayaran invoice tersebut. Terima kasih atas kerja sama yang baik.`;
      break;
  }

  const pesanTeks = `${picGreeting},
${p.klien}

${intro}

============================================================
RINCIAN INVOICE & TAGIHAN
============================================================
• Nomor Invoice      : ${p.nomorInvoice}${fpText}
• Nomor PO           : ${p.nomorPo}
• Nama Proyek        : ${p.namaProyek}
• Periode Layanan    : ${p.periode}
• Tanggal Invoice    : ${p.tanggalInvoice}
• Tanggal Jatuh Tempo: ${p.tanggalJatuhTempo}
• Status Umur        : ${p.hariTerlambat > 0 ? `Menunggak ${p.hariTerlambat} hari` : `Jatuh tempo dalam ${Math.abs(p.hariTerlambat)} hari`}
------------------------------------------------------------
• Total Nilai Tagihan: ${totalFormatted}
• Sisa Piutang       : ${sisaFormatted}
============================================================

Pembayaran dapat ditransfer ke salah satu rekening koran resmi kami:

1. ${REKENING_PEMBAYARAN[0].bank}
   Cabang        : ${REKENING_PEMBAYARAN[0].cabang}
   Nomor Rekening: ${REKENING_PEMBAYARAN[0].nomorRekening}
   Atas Nama     : ${REKENING_PEMBAYARAN[0].atasNama}

2. ${REKENING_PEMBAYARAN[1].bank}
   Cabang        : ${REKENING_PEMBAYARAN[1].cabang}
   Nomor Rekening: ${REKENING_PEMBAYARAN[1].nomorRekening}
   Atas Nama     : ${REKENING_PEMBAYARAN[1].atasNama}

${closing}

Hormat kami,
Finance & Invoicing Department
PT IDStar Cipta Teknologi
The Bellagio Mansion, Ground Floor, Mega Kuningan
Jakarta Selatan, DKI Jakarta 12950
Email : finance@idstar.group | invoicing@idstar.group
Telepon: +62 21 576-0888
Website: https://idstar.co.id`;

  const mailtoUrl = `mailto:${encodeURIComponent(p.emailPic)}?subject=${encodeURIComponent(subjek)}&body=${encodeURIComponent(pesanTeks)}`;

  return {
    subjek,
    pesanTeks,
    mailtoUrl,
  };
}
