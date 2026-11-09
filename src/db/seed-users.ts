import { db } from "./index";
import { users } from "./schema";
import { hashKataSandi } from "@/lib/auth";
import { AUTHORIZED_USERS } from "@/lib/user-roles";
import { eq } from "drizzle-orm";

async function main() {
  const passwordHashIdstar = await hashKataSandi("idstar123");
  const passwordHashDemo = await hashKataSandi("contoh123");

  for (const [email, profile] of Object.entries(AUTHORIZED_USERS)) {
    const isDemo = email.endsWith("@contoh.local");
    const passwordHash = isDemo ? passwordHashDemo : passwordHashIdstar;

    const rolesString = profile.roles.join(",");

    const [existing] = await db.select().from(users).where(eq(users.email, email));
    if (existing) {
      await db
        .update(users)
        .set({
          nama: profile.nama,
          role: rolesString,
          passwordHash: passwordHash,
          aktif: true,
        })
        .where(eq(users.id, existing.id));
      console.log(`Updated: ${email} (${rolesString})`);
    } else {
      await db.insert(users).values({
        nama: profile.nama,
        email: profile.email,
        passwordHash: passwordHash,
        role: rolesString,
        aktif: true,
      });
      console.log(`Created: ${email} (${rolesString})`);
    }
  }
}

main()
  .then(() => {
    console.log("\nFinished seeding users.");
    process.exit(0);
  })
  .catch((err) => {
    console.error("FAILED:", err.message);
    process.exit(1);
  });
