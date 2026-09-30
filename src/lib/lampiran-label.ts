// Label khusus/reserved untuk lampiran pengajuan yang dipakai otomatis sebagai
// halaman 2 ("Lampiran" — tabel PO Value/Done GR/Last PO Balance/%Completion)
// di PDF gabungan CAC/BAST. Input Data mengunggah potongan gambar/PDF halaman
// itu dari spreadsheet tracking PO eksternal dengan label PERSIS ini supaya
// otomatis dikenali & ditempel. Lampiran dengan label lain tetap tersimpan
// sebagai dokumen pendukung biasa (tidak ikut ditempel ke PDF).
// Lihat PROJECT_INSTRUCTIONS.md bagian 25.
export const LABEL_LAMPIRAN_BALANCE = "Lampiran Balance PO";
