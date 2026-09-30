import { db } from "@/db";
import { kalenderKerja } from "@/db/schema";
import { desc } from "drizzle-orm";
import FormTambahKalender from "./kalender-form";
import TombolHapus from "./hapus-button";

const LABEL_TIPE: Record<string, string> = {
  kerja: "Hari kerja (override)",
  libur_nasional: "Libur nasional",
  cuti_bersama: "Cuti bersama",
};

export default async function HalamanKalender() {
  const daftar = await db.select().from(kalenderKerja).orderBy(desc(kalenderKerja.tanggal));

  return (
    <div>
      <h1>Kalender Kerja</h1>
      <p className="subtitle">
        Sabtu &amp; Minggu otomatis dianggap hari nonkerja oleh mesin perhitungan —
        di sini Anda hanya perlu menandai <b>pengecualian</b>: libur nasional, cuti bersama, atau override hari kerja.
      </p>
      <FormTambahKalender />
      <div className="table-wrap">
        <table>
          <thead><tr><th>Tanggal</th><th>Tipe</th><th>Keterangan</th><th></th></tr></thead>
          <tbody>
            {daftar.map((k) => (
              <tr key={k.tanggal}>
                <td>{k.tanggal}</td>
                <td>{LABEL_TIPE[k.tipe] ?? k.tipe}</td>
                <td>{k.keterangan ?? "-"}</td>
                <td><TombolHapus url={`/api/kalender/${k.tanggal}`} konfirmasi={`Hapus entri kalender ${k.tanggal}?`} /></td>
              </tr>
            ))}
            {daftar.length === 0 && <tr><td colSpan={4} className="table-empty">Belum ada data.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
