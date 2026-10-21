import { wajibRole } from "@/lib/require-role";
import { db } from "@/db";
import { pengajuan, pengajuanDetail, personel, po, poLineItem, userXl, konfirmasi, checkerReview, users, dokumen, lampiranPengajuan, grRequest, grRequestRiwayat } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { notFound } from "next/navigation";
import TombolKonfirmasi from "./konfirmasi-button";
import FormChecker from "./checker-form";
import TombolBuatDokumen from "./tombol-buat-dokumen";
import FormLampiran from "./lampiran-form";
import TombolHapusLampiran from "./lampiran-hapus-button";
import Topbar from "@/components/topbar";
import { LABEL_LAMPIRAN_BALANCE } from "@/lib/lampiran-label";
import FormStatusProses from "./status-proses-form";
import GrRequestPanel from "./gr-request-panel";
import { alias } from "drizzle-orm/pg-core";
import { apakahKlienXl } from "@/lib/klien";

const LABEL_STATUS: Record<string, string> = {
  draft: "Draft", menunggu_checker: "Menunggu Checker", perlu_revisi: "Perlu Revisi",
  siap_diajukan: "Siap Diajukan", diajukan: "Diajukan",
};

const LABEL_JENIS_DOKUMEN: Record<string, string> = { CAC: "CAC", BAST: "BAST" };

function formatRupiah(nilai: string) {
  return "Rp" + Number(nilai).toLocaleString("id-ID", { minimumFractionDigits: 2 });
}

export default async function DetailPengajuan({ params }: { params: Promise<{ id: string }> }) {
  const userLogin = await wajibRole(["petugas", "checker"]);
  const { id } = await params;

  const [header] = await db
    .select({
      id: pengajuan.id, periode: pengajuan.periode, status: pengajuan.status, versi: pengajuan.versi,
      nomorPo: po.nomorPo, namaProyek: po.namaProyek, namaUserXl: userXl.nama,
      namaFilePoAsli: po.namaFilePoAsli,
      klien: po.klien, jenisTagihan: po.jenisTagihan, keteranganTahap: pengajuan.keteranganTahap,
      tanggalSubmitCac: pengajuan.tanggalSubmitCac,
      tanggalCacApproved: pengajuan.tanggalCacApproved,
      tanggalRequestGr: pengajuan.tanggalRequestGr,
      tanggalGrDisetujui: pengajuan.tanggalGrDisetujui,
      tanggalSubmitInvoice: pengajuan.tanggalSubmitInvoice,
      tanggalApproveInvoice: pengajuan.tanggalApproveInvoice,
      nomorInvoice: pengajuan.nomorInvoice,
      approvalAlokasiUserXlPemberi: pengajuan.approvalAlokasiUserXlPemberi,
      approvalAlokasiTanggal: pengajuan.approvalAlokasiTanggal,
      approvalAlokasiReferensi: pengajuan.approvalAlokasiReferensi,
    })
    .from(pengajuan)
    .innerJoin(po, eq(pengajuan.poId, po.id))
    .innerJoin(userXl, eq(pengajuan.userXlId, userXl.id))
    .where(eq(pengajuan.id, Number(id)));
  if (!header) notFound();

  const userDiunggah = alias(users, "user_diunggah");
  const userDicek = alias(users, "user_dicek");
  const [grRequestRow] = await db
    .select({
      namaFileGenerate: grRequest.namaFileGenerate, digeneratePada: grRequest.digeneratePada,
      namaFileBalikanXl: grRequest.namaFileBalikanXl, diunggahBalikanPada: grRequest.diunggahBalikanPada,
      namaDiunggahBalikanOleh: userDiunggah.nama,
      namaFileGabungan: grRequest.namaFileGabungan, digabungPada: grRequest.digabungPada,
      dicekPada: grRequest.dicekPada, namaDicekOleh: userDicek.nama, catatanCek: grRequest.catatanCek,
    })
    .from(grRequest)
    .leftJoin(userDiunggah, eq(grRequest.diunggahBalikanOlehUserId, userDiunggah.id))
    .leftJoin(userDicek, eq(grRequest.dicekOlehUserId, userDicek.id))
    .where(eq(grRequest.pengajuanId, header.id));
  const dataGrRequest = grRequestRow ?? null;

  // Riwayat versi GR Request (bagian 36) — terbaru dulu.
  const riwayatGrRequest = await db
    .select({
      id: grRequestRiwayat.id, langkah: grRequestRiwayat.langkah,
      namaFile: grRequestRiwayat.namaFile, waktu: grRequestRiwayat.waktu,
      namaUser: users.nama, catatan: grRequestRiwayat.catatan,
    })
    .from(grRequestRiwayat)
    .leftJoin(users, eq(grRequestRiwayat.olehUserId, users.id))
    .where(eq(grRequestRiwayat.pengajuanId, header.id))
    .orderBy(desc(grRequestRiwayat.id));

  const rincian = await db
    .select({
      id: pengajuanDetail.id, namaPersonel: personel.nama,
      hariKerjaDapatDitagihkan: pengajuanDetail.hariKerjaDapatDitagihkan,
      hariKerjaAcuanBulan: pengajuanDetail.hariKerjaAcuanBulan,
      nilaiRateDipakai: pengajuanDetail.nilaiRateDipakai, hasilHitung: pengajuanDetail.hasilHitung,
      nilaiPenuh: pengajuanDetail.nilaiPenuh,
      sumberHitung: pengajuanDetail.sumberHitung,
      poLineItemId: pengajuanDetail.poLineItemId,
      nomorLine: poLineItem.nomorLine,
      deskripsiLine: poLineItem.deskripsi,
    })
    .from(pengajuanDetail)
    .innerJoin(personel, eq(pengajuanDetail.personelId, personel.id))
    .leftJoin(poLineItem, eq(pengajuanDetail.poLineItemId, poLineItem.id))
    .where(eq(pengajuanDetail.pengajuanId, header.id));

  const riwayatKonfirmasi = await db
    .select({ waktu: konfirmasi.waktu, versi: konfirmasi.versiDikonfirmasi, namaUser: users.nama })
    .from(konfirmasi).innerJoin(users, eq(konfirmasi.userId, users.id))
    .where(eq(konfirmasi.pengajuanId, header.id));

  const riwayatChecker = await db
    .select({ waktu: checkerReview.waktu, hasil: checkerReview.hasil, catatan: checkerReview.catatan, namaUser: users.nama })
    .from(checkerReview).innerJoin(users, eq(checkerReview.userId, users.id))
    .where(eq(checkerReview.pengajuanId, header.id));

  const daftarDokumen = await db
    .select({ id: dokumen.id, jenis: dokumen.jenis, versi: dokumen.versi, dibuatPada: dokumen.dibuatPada, status: dokumen.status })
    .from(dokumen)
    .where(eq(dokumen.pengajuanId, header.id))
    .orderBy(desc(dokumen.id));

  const daftarLampiran = await db
    .select({ id: lampiranPengajuan.id, label: lampiranPengajuan.label, namaFile: lampiranPengajuan.namaFile, diunggahPada: lampiranPengajuan.diunggahPada })
    .from(lampiranPengajuan)
    .where(eq(lampiranPengajuan.pengajuanId, header.id))
    .orderBy(desc(lampiranPengajuan.id));

  const total = rincian.reduce((acc, r) => acc + Number(r.hasilHitung), 0);

  const bisaKonfirmasi = (header.status === "draft" || header.status === "perlu_revisi") &&
    userLogin.role === "petugas";
  const bisaEdit = header.status === "perlu_revisi" && userLogin.role === "petugas";
  const bisaDicek = header.status === "menunggu_checker" &&
    userLogin.role === "checker";
  const bisaBuatDokumen = (header.status === "siap_diajukan" || header.status === "diajukan") &&
    userLogin.role === "petugas";
  // Kelengkapan dokumen (CAC, BAST, lampiran tambahan) — disiapkan Input Data
  // ATAU Checker, sebagai prasyarat sebelum otomasi ke Get Approve/COUPA bisa
  // dijalankan (belum dibangun). Lihat PROJECT_INSTRUCTIONS.md bagian 22-23.
  const bisaKelengkapan = (header.status === "siap_diajukan" || header.status === "diajukan") &&
    (userLogin.role === "petugas" || userLogin.role === "checker");
  const cacAda = daftarDokumen.some((d) => d.jenis === "CAC");
  const bastAda = daftarDokumen.some((d) => d.jenis === "BAST");
  const lampiranBalanceAda = daftarLampiran.some((l) => l.label === LABEL_LAMPIRAN_BALANCE);
  const lampiranLain = daftarLampiran.filter((l) => l.label !== LABEL_LAMPIRAN_BALANCE);
  const poAsliAda = !!header.namaFilePoAsli;
  // Bagian 40-43: klien XL tetap lewat proses CAC seperti sekarang; klien
  // Non-XL TIDAK lewat CAC, tapi tetap wajib timesheet + BAST sebelum invoice
  // bisa diajukan. Deteksi HANYA dari po.klien (client_name), lihat src/lib/klien.ts.
  const isKlienXl = apakahKlienXl(header.klien);
  const isTagihanTahap = !!header.keteranganTahap || header.jenisTagihan === "tahap";
  const semuaPakaiTimesheet = rincian.length > 0 && rincian.every((r) => r.sumberHitung === "timesheet");

  return (
    <>
      <Topbar nama={userLogin.nama} role={userLogin.role} />
      <main className="page">
        <a href="/pengajuan" className="back-link">&larr; Daftar Pengajuan</a>
        <h1>Pengajuan {header.periode} — {header.nomorPo}</h1>
        <p className="subtitle">
          Proyek: <b>{header.namaProyek}</b> &middot; User XL: <b>{header.namaUserXl}</b> &middot;
          Status: <span className={`badge badge-${header.status}`}>{LABEL_STATUS[header.status] ?? header.status}</span> &middot; Versi: {header.versi}
          {header.klien && (
            <> &middot; Klien: <b>{header.klien}</b>{" "}
              <span className={`badge ${isKlienXl ? "badge-siap_diajukan" : "badge-draft"}`}>
                {isKlienXl ? "XL — proses CAC" : "Non-XL — tanpa CAC"}
              </span>
            </>
          )}
          {header.keteranganTahap && (
            <> &middot; Tagihan tahap: <b>{header.keteranganTahap}</b></>
          )}
          {!bastAda && (header.status === "siap_diajukan" || header.status === "diajukan") && (
            <span className="badge badge-danger" style={{ marginLeft: 8 }} title="Dokumen BAST belum dibuat">
              ⚠️ BAST Belum Dibuat
            </span>
          )}
        </p>
        {(header.approvalAlokasiUserXlPemberi || header.approvalAlokasiTanggal || header.approvalAlokasiReferensi) && (
          <p className="subtitle">
            Approval alokasi lintas-PO (dicatat manual): <b>{header.approvalAlokasiUserXlPemberi ?? "-"}</b>
            {header.approvalAlokasiTanggal && <> &middot; {header.approvalAlokasiTanggal}</>}
            {header.approvalAlokasiReferensi && <> &middot; ref: {header.approvalAlokasiReferensi}</>}
          </p>
        )}

        <div className="table-wrap">
          <table>
            <thead><tr>
              <th>Personel</th><th>PO Line</th><th>Rate</th>
              <th>Hari Ditagihkan / Acuan</th><th>Sumber</th><th>Hasil Hitung</th>
            </tr></thead>
            <tbody>
              {rincian.map((r) => {
                const sebagian = r.nilaiPenuh && Number(r.nilaiPenuh) > Number(r.hasilHitung);
                return (
                <tr key={r.id}>
                  <td>{r.namaPersonel}</td>
                  <td>
                    {r.nomorLine ? (
                      <span className="badge badge-draft" title={r.deskripsiLine ?? ""}>
                        Line {r.nomorLine}
                      </span>
                    ) : (
                      <span style={{ color: "var(--color-text-muted)", fontSize: 12 }}>-</span>
                    )}
                  </td>
                  <td>{formatRupiah(r.nilaiRateDipakai)}</td>
                  <td>{r.sumberHitung === "manual" ? "-" : `${r.hariKerjaDapatDitagihkan} / ${r.hariKerjaAcuanBulan}`}</td>
                  <td>
                    <span className={`badge ${r.sumberHitung === "timesheet" ? "badge-siap_diajukan" : ""}`}>
                      {r.sumberHitung === "timesheet" ? "Timesheet" : r.sumberHitung === "manual" ? "Manual (tahap)" : "Kalender"}
                    </span>
                  </td>
                  <td>
                    {formatRupiah(r.hasilHitung)}
                    {sebagian && (
                      <div style={{ fontSize: 12, color: "var(--color-muted, #666)" }}>
                        sebagian dari {formatRupiah(r.nilaiPenuh!)} — sisanya ditagihkan di PO lain
                      </div>
                    )}
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="card" style={{ display: "inline-block", padding: "10px 16px", fontSize: 15, marginTop: 12 }}>
          Total: <b>{formatRupiah(String(total))}</b>
        </p>

        {bisaEdit && (
          <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <a href={`/pengajuan/${header.id}/edit`} className="btn">Edit Rincian</a>
            <TombolKonfirmasi pengajuanId={header.id} />
          </div>
        )}
        {bisaKonfirmasi && !bisaEdit && (
          <div style={{ marginTop: 12 }}>
            <TombolKonfirmasi pengajuanId={header.id} />
          </div>
        )}
        {bisaDicek && (
          <div style={{ marginTop: 12 }}>
            <FormChecker pengajuanId={header.id} />
          </div>
        )}
        {!bisaKonfirmasi && !bisaDicek && !bisaBuatDokumen && header.status !== "siap_diajukan" && header.status !== "diajukan" && (
          <p className="subtitle" style={{ marginTop: 12 }}>
            Tidak ada aksi untuk Anda pada status ini (role Anda: {userLogin.role}).
          </p>
        )}
        {header.status === "siap_diajukan" && (
          <div className="alert alert-success" style={{ marginTop: 12 }}>
            ✓ Sudah diperiksa Checker dan siap diajukan ke XL.
          </div>
        )}

        {bisaBuatDokumen && (
          <div className="card" style={{ marginTop: 20 }}>
            <h3 style={{ marginTop: 0 }}>Dokumen {isKlienXl ? "CAC / BAST" : "BAST"}</h3>
            <p className="subtitle">
              {isKlienXl ? (
                <>Draf internal berdasarkan data pengajuan ini, mengikuti template resmi CAC/BAST yang sudah
                dikonfirmasi — tetap gunakan Get Approve CAC / COUPA untuk pengajuan resmi ke XL.</>
              ) : (
                <>Klien Non-XL — tidak lewat proses CAC. Cukup BAST + timesheet sebagai dasar invoice
                (bagian 40-43). Format BAST khusus Non-XL menyusul di bagian terpisah; dokumen di bawah
                masih memakai format sementara.</>
              )}
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              {isKlienXl && <TombolBuatDokumen pengajuanId={header.id} jenis="CAC" />}
              <TombolBuatDokumen pengajuanId={header.id} jenis="BAST" />
            </div>

            {daftarDokumen.length > 0 && (
              <div className="table-wrap" style={{ marginTop: 16 }}>
                <table>
                  <thead><tr><th>Jenis</th><th>Versi</th><th>Status</th><th>Dibuat</th><th></th></tr></thead>
                  <tbody>
                    {daftarDokumen.map((d) => (
                      <tr key={d.id}>
                        <td>{LABEL_JENIS_DOKUMEN[d.jenis] ?? d.jenis}</td>
                        <td>{d.versi}</td>
                        <td><span className="badge badge-draft">{d.status}</span></td>
                        <td>{d.dibuatPada}</td>
                        <td><a href={`/pengajuan/${header.id}/dokumen/${d.id}`} className="btn-text">Buka</a></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {bisaKelengkapan && (
          <div className="card" style={{ marginTop: 20 }}>
            <h3 style={{ marginTop: 0 }}>Status Proses CAC &rarr; Invoice</h3>
            <p className="subtitle">
              Tanggal submit CAC otomatis (dari tanggal Checker meloloskan pengajuan). Tanggal lainnya
              dicatat manual mengikuti proses di Get Approve/COUPA (otomasinya belum dibangun).
            </p>
            <p style={{ margin: "0 0 4px", fontSize: 14 }}>
              Tanggal Submit CAC (otomatis): <b>{header.tanggalSubmitCac ?? "belum diloloskan Checker"}</b>
              {header.tanggalSubmitCac && header.tanggalApproveInvoice && (
                <> &middot; total proses sampai invoice disetujui: <b>{Math.round((new Date(header.tanggalApproveInvoice + "T00:00:00Z").getTime() - new Date(header.tanggalSubmitCac + "T00:00:00Z").getTime()) / 86400000)} hari</b></>
              )}
              {header.nomorInvoice && <> &middot; Nomor Invoice: <b>{header.nomorInvoice}</b></>}
            </p>
            <FormStatusProses
              pengajuanId={header.id}
              nomorInvoiceAwal={header.nomorInvoice}
              grRequestSudahDicek={!isKlienXl || !!dataGrRequest?.dicekPada}
              isKlienXl={isKlienXl}
              bastAda={bastAda}
              nilaiAwal={{
                tanggalCacApproved: header.tanggalCacApproved,
                tanggalRequestGr: header.tanggalRequestGr,
                tanggalGrDisetujui: header.tanggalGrDisetujui,
                tanggalSubmitInvoice: header.tanggalSubmitInvoice,
                tanggalApproveInvoice: header.tanggalApproveInvoice,
              }}
            />
          </div>
        )}

        {/* Bagian 45: GR Request cuma berlaku untuk klien XL (proses CAC/COUPA) —
            klien Non-XL skip total, tidak ditampilkan sama sekali. */}
        {bisaKelengkapan && isKlienXl && (
          <GrRequestPanel pengajuanId={header.id} data={dataGrRequest} role={userLogin.role} riwayat={riwayatGrRequest} />
        )}

        {bisaKelengkapan && (
          <div className="card" style={{ marginTop: 20 }}>
            <h3 style={{ marginTop: 0 }}>Kelengkapan Dokumen — sebelum ajukan ke Get Approve/COUPA</h3>
            <p className="subtitle">
              Siapkan semua ini dulu di sini — CAC, BAST, spreadsheet tracking PO, dan dokumen pendukung lain
              sesuai kebutuhan — baru lampirkan saat mengajukan CAC/BAST ke Get Approve atau invoice ke COUPA
              (otomasi pengajuannya sendiri belum dibangun, ini baru tempat menyiapkan lampirannya).
            </p>
            <ul style={{ margin: "0 0 16px 0", paddingLeft: 18, fontSize: 14 }}>
              {isKlienXl ? (
                <li>{cacAda ? "✓" : "○"} Dokumen CAC {cacAda ? "sudah dibuat" : "belum dibuat"}</li>
              ) : isTagihanTahap ? (
                <li>✓ Tagihan tahap (manual) — timesheet tidak disyaratkan {header.keteranganTahap ? `(${header.keteranganTahap})` : ""}</li>
              ) : (
                <li>{semuaPakaiTimesheet ? "✓" : "○"} Timesheet {semuaPakaiTimesheet ? "sudah jadi dasar hitung semua personel" : "belum lengkap untuk semua personel (klien Non-XL wajib timesheet)"}</li>
              )}
              <li>
                {bastAda ? "✓" : "○"} Dokumen BAST {bastAda ? "sudah dibuat" : "belum dibuat"}
                {!bastAda && <span className="badge badge-danger" style={{ marginLeft: 6, fontSize: 11 }}>Wajib</span>}
              </li>
              <li>{poAsliAda ? "✓" : "○"} Dokumen PO Asli — {poAsliAda ? header.namaFilePoAsli : <>belum diunggah, <a href="/data-referensi/po">unggah di Data Referensi · PO/Item</a></>}</li>
              <li>{lampiranBalanceAda ? "✓" : "○"} Lampiran Balance PO (potongan tabel dari spreadsheet tracking) {lampiranBalanceAda ? "sudah diunggah" : "belum diunggah"}</li>
              <li>{lampiranLain.length > 0 ? "✓" : "○"} Lampiran tambahan lain (spreadsheet, dokumen pendukung lain) — {lampiranLain.length} file diunggah</li>
            </ul>
            <p className="subtitle" style={{ fontSize: 12, marginBottom: 4 }}>
              Untuk halaman Lampiran Balance PO, isi label persis <b>&quot;{LABEL_LAMPIRAN_BALANCE}&quot;</b> supaya otomatis
              ditempel sebagai halaman 2 di PDF gabungan CAC/BAST.
            </p>
            <FormLampiran pengajuanId={header.id} labelSaran={LABEL_LAMPIRAN_BALANCE} />
            {daftarLampiran.length > 0 && (
              <div className="table-wrap" style={{ marginTop: 16 }}>
                <table>
                  <thead><tr><th>Label</th><th>Nama File</th><th>Diunggah</th><th></th></tr></thead>
                  <tbody>
                    {daftarLampiran.map((l) => (
                      <tr key={l.id}>
                        <td>{l.label}{l.label === LABEL_LAMPIRAN_BALANCE && " ✓"}</td>
                        <td>{l.namaFile}</td>
                        <td>{l.diunggahPada}</td>
                        <td><TombolHapusLampiran pengajuanId={header.id} lampiranId={l.id} konfirmasi={`Hapus lampiran "${l.label}"?`} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {(riwayatKonfirmasi.length > 0 || riwayatChecker.length > 0) && (
          <div className="card" style={{ marginTop: 24 }}>
            <h3 style={{ marginTop: 0 }}>Riwayat</h3>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13.5, color: "var(--color-text-muted)" }}>
              {riwayatKonfirmasi.map((k, i) => (
                <li key={`k${i}`}>Dikonfirmasi oleh <b>{k.namaUser}</b> (versi {k.versi}) — {k.waktu}</li>
              ))}
              {riwayatChecker.map((c, i) => (
                <li key={`c${i}`}>
                  Diperiksa oleh <b>{c.namaUser}</b> — hasil: <b>{LABEL_STATUS[c.hasil] ?? c.hasil}</b>
                  {c.catatan ? ` (catatan: ${c.catatan})` : ""} — {c.waktu}
                </li>
              ))}
            </ul>
          </div>
        )}
      </main>
    </>
  );
}
