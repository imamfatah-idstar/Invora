import { db } from "@/db";
import { auditLog } from "@/db/schema";

// Dipanggil dari setiap aksi tambah/ubah/hapus/transisi status.
// "perubahan" cukup ringkasan singkat yang bisa dibaca manusia (bukan dump JSON
// mentah semua kolom) — cukup untuk penelusuran "siapa mengubah apa, kapan".
export async function catatAudit(params: {
  entitas: string;
  entitasId: number;
  perubahan: string;
  userId: number;
}) {
  await db.insert(auditLog).values({
    entitas: params.entitas,
    entitasId: params.entitasId,
    perubahan: params.perubahan,
    userId: params.userId,
  });
}
