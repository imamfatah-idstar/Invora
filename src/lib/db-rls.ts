import { sql } from "drizzle-orm";
import { db } from "@/db";

export interface SupabaseJwtClaims {
  sub: string;       // User ID (UUID)
  role: "authenticated" | "anon";
  email?: string;
  tenant_id?: string;
}

/**
 * Menjalankan operasi database Drizzle di dalam transaksi terisolasi
 * yang mengaktifkan konteks Row-Level Security (RLS) Supabase.
 */
export async function withRlsContext<T>(
  claims: SupabaseJwtClaims,
  callback: (tx: Parameters<Parameters<typeof db.transaction>[0]>[0]) => Promise<T>
): Promise<T> {
  if (!claims.sub || claims.role !== "authenticated") {
    throw new Error("Konteks autentikasi tidak valid untuk eksekusi database.");
  }

  return await db.transaction(async (tx) => {
    // 1. Set klaim JWT ke dalam sesi lokal transaksi PostgreSQL
    await tx.execute(
      sql`SELECT set_config('request.jwt.claims', ${JSON.stringify(claims)}, true)`
    );
    await tx.execute(
      sql`SELECT set_config('request.jwt.claim.sub', ${claims.sub}, true)`
    );

    // 2. Turunkan hak akses transaksi dari superuser menjadi 'authenticated'
    // agar seluruh policy RLS pada tabel dievaluasi oleh PostgreSQL
    await tx.execute(sql`SET LOCAL ROLE authenticated`);

    // 3. Jalankan query aplikasi di dalam konteks yang sudah diamankan
    return await callback(tx);
  });
}

