import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Database Supabase (PostgreSQL). DATABASE_URL diisi di .env (tidak ikut git).
// prepare:false dipakai supaya tetap kompatibel baik lewat Session Pooler
// maupun Transaction Pooler Supabase (yang tidak mendukung prepared statement).
const databaseUrl = process.env.DATABASE_URL || "postgresql://postgres:placeholder@127.0.0.1:5432/postgres";

if (!process.env.DATABASE_URL && process.env.NODE_ENV === "production" && typeof window === "undefined") {
  console.warn("PERINGATAN: DATABASE_URL belum diatur di Environment Variables Vercel.");
}

const client = postgres(databaseUrl, { prepare: false });
export const db = drizzle(client, { schema });
