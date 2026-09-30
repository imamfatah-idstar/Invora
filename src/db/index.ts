import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Database Supabase (PostgreSQL). DATABASE_URL diisi di .env (tidak ikut git).
// prepare:false dipakai supaya tetap kompatibel baik lewat Session Pooler
// maupun Transaction Pooler Supabase (yang tidak mendukung prepared statement).
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL belum diisi di .env — lihat README/PROJECT_INSTRUCTIONS untuk cara mengambilnya dari Supabase.");
}

const client = postgres(process.env.DATABASE_URL, { prepare: false });
export const db = drizzle(client, { schema });
