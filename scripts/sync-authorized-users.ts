import "dotenv/config";
import { db } from "../src/db";
import { users } from "../src/db/schema";
import { hashKataSandi } from "../src/lib/auth";
import { eq } from "drizzle-orm";
import { AUTHORIZED_USERS } from "../src/lib/user-roles";

async function main() {
  console.log("Syncing authorized users in database...");
  const passwordHashIdstar = await hashKataSandi("idstar123");
  const passwordHashDemo = await hashKataSandi("contoh123");

  for (const [email, profile] of Object.entries(AUTHORIZED_USERS)) {
    const isDemo = email.endsWith("@contoh.local");
    const passwordHash = isDemo ? passwordHashDemo : passwordHashIdstar;

    const [existing] = await db.select().from(users).where(eq(users.email, email));
    if (existing) {
      await db
        .update(users)
        .set({
          nama: profile.nama,
          role: profile.primaryRole,
          passwordHash: passwordHash,
          aktif: true,
        })
        .where(eq(users.id, existing.id));
      console.log(`Updated user: ${email} -> ${profile.nama} (${profile.primaryRole})`);
    } else {
      await db.insert(users).values({
        nama: profile.nama,
        email: profile.email,
        passwordHash: passwordHash,
        role: profile.primaryRole,
        aktif: true,
      });
      console.log(`Created user: ${email} -> ${profile.nama} (${profile.primaryRole})`);
    }
  }

  // Also rename any leftover "Admin Contoh", "Checker Contoh", "Petugas Contoh"
  const allUsers = await db.select().from(users);
  for (const u of allUsers) {
    if (u.nama.includes("Contoh")) {
      const clean = u.nama.replace(/\b(Contoh|contoh)\b/gi, "").trim();
      await db.update(users).set({ nama: clean }).where(eq(users.id, u.id));
      console.log(`Cleaned name for user ${u.email}: ${u.nama} -> ${clean}`);
    }
  }

  console.log("\nFinished syncing users.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Failed:", err);
    process.exit(1);
  });

