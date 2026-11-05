import { db } from "@/db";
import { userXl } from "@/db/schema";
import { desc } from "drizzle-orm";
import FormTambahUserXl from "./user-xl-form";
import FormImporUserXl from "./impor-user-xl-form";
import TabelUserXl from "./user-xl-table";

export default async function HalamanUserXl() {
  const daftar = await db.select().from(userXl).orderBy(desc(userXl.id));
  return (
    <div>
      <h1>Client Approvers (User XL)</h1>
      <p className="subtitle">External client decision-makers / approvers — approvals are tracked internally.</p>
      <FormImporUserXl />
      <FormTambahUserXl />
      <TabelUserXl daftar={daftar} />
    </div>
  );
}
