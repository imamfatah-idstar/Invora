import { db } from "@/db";
import { rateCard, personel, pemetaanPersonelPo, po } from "@/db/schema";
import { desc, eq, isNull } from "drizzle-orm";
import FormTambahRateCard from "./rate-card-form";
import TabelRateCard from "./rate-card-table";

export default async function HalamanRateCard() {
  const daftarPersonel = await db.select().from(personel);

  // Klien + No PO per personel (bagian 49-51, dikoreksi dari "penempatan" ke
  // "klien" — penempatan adalah alamat/site, klien adalah nama resmi klien
  // dari po.klien via pemetaan_personel_po yang masih aktif). Satu personel
  // bisa punya lebih dari satu PO/klien aktif sekaligus (alokasi lintas-PO,
  // bagian 35) — digabung koma kalau lebih dari satu. Kolom ini HANYA
  // terisi setelah personel dipetakan ke PO yang sudah ada di database
  // (lihat data-referensi/po) — kalau PO belum diimpor, kolom ini kosong.
  const pemetaanAktif = await db
    .select({
      personelId: pemetaanPersonelPo.personelId,
      klien: po.klien,
      nomorPo: po.nomorPo,
    })
    .from(pemetaanPersonelPo)
    .innerJoin(po, eq(pemetaanPersonelPo.poId, po.id))
    .where(isNull(pemetaanPersonelPo.berlakuSampai));
  const klienPerPersonel = new Map<number, string[]>();
  const noPoPerPersonel = new Map<number, string[]>();
  for (const p of pemetaanAktif) {
    if (p.klien) {
      const arr = klienPerPersonel.get(p.personelId) ?? [];
      if (!arr.includes(p.klien)) arr.push(p.klien);
      klienPerPersonel.set(p.personelId, arr);
    }
    if (p.nomorPo) {
      const arr = noPoPerPersonel.get(p.personelId) ?? [];
      if (!arr.includes(p.nomorPo)) arr.push(p.nomorPo);
      noPoPerPersonel.set(p.personelId, arr);
    }
  }

  const daftarMentah = await db
    .select({
      id: rateCard.id, nilaiRate: rateCard.nilaiRate,
      berlakuDari: rateCard.berlakuDari, berlakuSampai: rateCard.berlakuSampai,
      namaPersonel: personel.nama, personelId: personel.id,
    })
    .from(rateCard)
    .innerJoin(personel, eq(rateCard.personelId, personel.id))
    .orderBy(desc(rateCard.id));

  const daftar = daftarMentah.map((r) => ({
    ...r,
    klien: klienPerPersonel.get(r.personelId)?.join(", ") ?? null,
    noPo: noPoPerPersonel.get(r.personelId)?.join(", ") ?? null,
  }));

  return (
    <div>
      <h1>Rate Card</h1>
      <p className="subtitle">Rate bulanan personel beserta masa berlaku.</p>
      <FormTambahRateCard daftarPersonel={daftarPersonel.map((p) => ({ id: p.id, nama: p.nama }))} />
      <TabelRateCard daftar={daftar} />
    </div>
  );
}
