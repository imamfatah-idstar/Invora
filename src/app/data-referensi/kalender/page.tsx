import { db } from "@/db";
import { kalenderKerja } from "@/db/schema";
import { desc } from "drizzle-orm";
import FormTambahKalender from "./kalender-form";
import TombolHapus from "./hapus-button";

const LABEL_TIPE: Record<string, string> = {
  kerja: "Working Day (Override)",
  libur_nasional: "National Holiday",
  cuti_bersama: "Collective Leave",
};

export default async function HalamanKalender() {
  const daftar = await db.select().from(kalenderKerja).orderBy(desc(kalenderKerja.tanggal));

  return (
    <div>
      <h1>Working Calendar</h1>
      <p className="subtitle">
        Saturdays &amp; Sundays are automatically treated as non-working days by the calculation engine —
        only register <b>exceptions</b> here: national holidays, collective leave, or working day overrides.
      </p>
      <FormTambahKalender />
      <div className="table-wrap">
        <table>
          <thead><tr><th>Date</th><th>Type</th><th>Description</th><th></th></tr></thead>
          <tbody>
            {daftar.map((k) => (
              <tr key={k.tanggal}>
                <td>{k.tanggal}</td>
                <td>{LABEL_TIPE[k.tipe] ?? k.tipe}</td>
                <td>{k.keterangan ?? "-"}</td>
                <td><TombolHapus url={`/api/kalender/${k.tanggal}`} konfirmasi={`Delete calendar entry ${k.tanggal}?`} /></td>
              </tr>
            ))}
            {daftar.length === 0 && <tr><td colSpan={4} className="table-empty">No records found.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
