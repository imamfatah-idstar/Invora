import { db } from "@/db";
import { po } from "@/db/schema";
import { desc } from "drizzle-orm";
import Decimal from "decimal.js";
import { wajibRole } from "@/lib/require-role";
import Topbar from "@/components/topbar";
import FilterTahun from "./filter-tahun";
import TabelSummaryPo from "./summary-po-table";

export default async function HalamanSummaryPo({ searchParams }: { searchParams: Promise<{ tahun?: string }> }) {
  const user = await wajibRole(["petugas", "checker"]);
  const { tahun: tahunParam } = await searchParams;

  const semuaPo = await db.select().from(po).orderBy(desc(po.tahun), desc(po.id));

  const daftarTahun = Array.from(new Set(semuaPo.map((p) => p.tahun))).sort((a, b) => b - a);
  const tahunDipilih = tahunParam && daftarTahun.includes(Number(tahunParam)) ? Number(tahunParam) : (daftarTahun[0] ?? new Date().getFullYear());

  const daftar = semuaPo
    .filter((p) => p.tahun === tahunDipilih)
    .map((p) => ({
      id: p.id,
      nomorPo: p.nomorPo,
      namaProyek: p.namaProyek,
      nilaiItem: p.nilaiItem,
      nilaiGr: p.nilaiGr,
      saldo: new Decimal(p.nilaiItem).minus(p.nilaiGr).toString(),
    }));

  const totalNilaiPo = daftar.reduce((acc, p) => acc.plus(p.nilaiItem), new Decimal(0));
  const totalGr = daftar.reduce((acc, p) => acc.plus(p.nilaiGr), new Decimal(0));
  const totalSaldo = totalNilaiPo.minus(totalGr);

  return (
    <>
      <Topbar nama={user.nama} role={user.role} />
      <main className="page">
        <a href="/dashboard" className="back-link">&larr; Dashboard</a>
        <h1>Summary PO</h1>
        <p className="subtitle">
          Ringkasan nilai PO, nilai yang sudah di-GR (Good Receipt), dan saldo per PO. Halaman lihat saja —
          nilai GR diisi manual oleh Petugas Pengajuan dan Konfirmasi di menu Data Referensi &middot; PO / Item, setelah GR
          disetujui di Get Approve CAC/COUPA (integrasi otomatis belum ada di MVP ini).
        </p>

        <FilterTahun daftarTahun={daftarTahun} tahunDipilih={tahunDipilih} />

        <TabelSummaryPo
          daftar={daftar}
          tahunDipilih={tahunDipilih}
          totalNilaiPo={totalNilaiPo.toString()}
          totalGr={totalGr.toString()}
          totalSaldo={totalSaldo.toString()}
        />
      </main>
    </>
  );
}
