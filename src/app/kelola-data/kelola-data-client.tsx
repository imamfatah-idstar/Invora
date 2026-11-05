"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Jumlah = Record<string, number>;

const KATEGORI: {
  key: "pengajuan" | "timesheet" | "personel" | "po" | "semua";
  label: string;
  deskripsi: string;
  tabelTerkait: string[];
  butuhKetik?: boolean;
}[] = [
  {
    key: "pengajuan",
    label: "Submissions (+ CAC/BAST documents, GR Request, confirmation, review)",
    deskripsi: "Safe standalone deletion — does not touch Personnel, PO, Rate Cards, Mappings, or Timesheets.",
    tabelTerkait: ["pengajuan", "pengajuanDetail", "dokumen", "lampiranPengajuan", "grRequest", "grRequestRiwayat", "konfirmasi", "checkerReview"],
  },
  {
    key: "timesheet",
    label: "Timesheets",
    deskripsi: "Delete all uploaded timesheet files. Safe standalone deletion.",
    tabelTerkait: ["timesheet"],
  },
  {
    key: "personel",
    label: "Personnel, Rate Cards & Resource Mapping",
    deskripsi: "⚠️ Also clears submission detail line items (pengajuan_detail). Submission headers remain at Rp0. Timesheet records are also removed.",
    tabelTerkait: ["personel", "rateCard", "pemetaanPersonelPo", "pengajuanDetail", "timesheet"],
  },
  {
    key: "po",
    label: "PO / Line Items & Resource Mapping",
    deskripsi: "Will FAIL if any existing Submissions still reference these POs — delete the \"Submissions\" category first.",
    tabelTerkait: ["po", "poLineItem", "pemetaanPersonelPo", "timesheet"],
  },
  {
    key: "semua",
    label: "TOTAL RESET — all data above simultaneously",
    deskripsi: "Personnel, Rate Cards, POs, Mappings, Submissions, and all related records. User accounts, Client Approvers, and Working Calendar are PRESERVED.",
    tabelTerkait: ["personel", "rateCard", "po", "poLineItem", "pemetaanPersonelPo", "pengajuan", "pengajuanDetail", "timesheet", "dokumen", "lampiranPengajuan", "grRequest", "grRequestRiwayat", "konfirmasi", "checkerReview"],
    butuhKetik: true,
  },
];

export default function KelolaDataClient({ jumlahAwal }: { jumlahAwal: Jumlah }) {
  const router = useRouter();
  const [jumlah, setJumlah] = useState(jumlahAwal);
  const [loading, setLoading] = useState<string | null>(null);
  const [ketikan, setKetikan] = useState<Record<string, string>>({});

  function totalUntuk(tabelTerkait: string[]) {
    return tabelTerkait.reduce((acc, t) => acc + (jumlah[t] ?? 0), 0);
  }

  async function hapus(kategoriItem: (typeof KATEGORI)[number]) {
    const total = totalUntuk(kategoriItem.tabelTerkait);
    if (total === 0) { alert("No data found in this category."); return; }
    if (kategoriItem.butuhKetik && ketikan[kategoriItem.key] !== "DELETE") {
      alert('Type "DELETE" (all uppercase) in the confirmation box for this category first.');
      return;
    }
    if (!window.confirm(`Are you sure you want to delete all data in category "${kategoriItem.label}"? Approximately ${total} rows will be deleted. This action CANNOT BE UNDONE.`)) return;

    setLoading(kategoriItem.key);
    const res = await fetch("/api/kelola-data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kategori: kategoriItem.key }),
    });
    const d = await res.json().catch(() => ({}));
    setLoading(null);
    if (!res.ok) { alert(d.error ?? "Failed to delete."); return; }
    setJumlah(d.sisa ?? jumlah);
    setKetikan((k) => ({ ...k, [kategoriItem.key]: "" }));
    router.refresh();
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 16 }}>
      {KATEGORI.map((k) => {
        const total = totalUntuk(k.tabelTerkait);
        return (
          <div key={k.key} className="card" style={{ borderColor: k.key === "semua" ? "var(--color-danger, #c0392b)" : undefined }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 240 }}>
                <h3 style={{ margin: "0 0 4px" }}>{k.label}</h3>
                <p className="subtitle" style={{ margin: 0, fontSize: 13 }}>{k.deskripsi}</p>
                <p style={{ margin: "6px 0 0", fontSize: 13 }}>Current total rows: <b>{total}</b></p>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
                {k.butuhKetik && (
                  <input
                    placeholder='Type "DELETE"'
                    value={ketikan[k.key] ?? ""}
                    onChange={(e) => setKetikan((s) => ({ ...s, [k.key]: e.target.value }))}
                    style={{ width: 160 }}
                  />
                )}
                <button
                  onClick={() => hapus(k)}
                  disabled={loading === k.key || total === 0}
                  className="btn"
                  style={{ background: "var(--color-danger, #c0392b)", color: "#fff", border: "none" }}
                >
                  {loading === k.key ? "Deleting..." : "Delete All"}
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
