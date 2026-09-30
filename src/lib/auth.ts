import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { db } from "@/db";
import { users, sessions } from "@/db/schema";
import { eq } from "drizzle-orm";

export type Role = "admin" | "petugas" | "checker";

const UMUR_SESI_JAM = 12; // sesi berlaku 12 jam sejak login

// --- Kata sandi ---

export async function hashKataSandi(kataSandiAsli: string): Promise<string> {
  return bcrypt.hash(kataSandiAsli, 10);
}

export async function cekKataSandi(
  kataSandiAsli: string,
  hashTersimpan: string
): Promise<boolean> {
  return bcrypt.compare(kataSandiAsli, hashTersimpan);
}

// --- Sesi ---

export async function buatSesi(userId: number) {
  const token = randomBytes(32).toString("hex");
  const kedaluwarsa = new Date(Date.now() + UMUR_SESI_JAM * 60 * 60 * 1000);
  await db.insert(sessions).values({
    token,
    userId,
    kedaluwarsaPada: kedaluwarsa.toISOString(),
  });
  return { token, kedaluwarsa };
}

export async function ambilUserDariSesi(token: string | undefined) {
  if (!token) return null;

  const [sesi] = await db.select().from(sessions).where(eq(sessions.token, token));
  if (!sesi) return null;

  if (new Date(sesi.kedaluwarsaPada) < new Date()) {
    // Sesi sudah kedaluwarsa — bersihkan dan anggap tidak login.
    await db.delete(sessions).where(eq(sessions.token, token));
    return null;
  }

  const [user] = await db.select().from(users).where(eq(users.id, sesi.userId));
  if (!user || !user.aktif) return null;

  return user;
}

export async function hapusSesi(token: string | undefined) {
  if (!token) return;
  await db.delete(sessions).where(eq(sessions.token, token));
}
