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
    label: "Pengajuan (+ dokumen CAC/BAST, GR Request, konfirmasi, checker)",
    deskripsi: "Aman berdiri sendiri — tidak menyentuh Personel, PO, Rate Card, Pemetaan, atau Timesheet.",
    tabelTerkait: ["pengajuan", "pengajuanDetail", "dokumen", "lampiranPengajuan", "grRequest", "grRequestRiwayat", "konfirmasi", "checkerReview"],
  },
  {
    key: "timesheet",
    label: "Timesheet",
    deskripsi: "Hapus semua file timesheet yang pernah diunggah. Aman berdiri sendiri.",
    tabelTerkait: ["timesheet"],
  },
  {
    key: "personel",
    label: "Personel, Rate Card & Pemetaan Personel-PO",
    deskripsi: "⚠️ Turut mengosongkan rincian pengajuan (pengajuan_detail) — header pengajuan tetap ada tapi jadi kosong/Rp0. Timesheet juga ikut terhapus.",
    tabelTerkait: ["personel", "rateCard", "pemetaanPersonelPo", "pengajuanDetail", "timesheet"],
  },
  {
    key: "po",
    label: "PO / Item, PO Line & Pemetaan Personel-PO",
    deskripsi: "Akan GAGAL (dan tidak menghapus apa pun) kalau masih ada Pengajuan yang memakai PO ini — hapus kategori \"Pengajuan\" dulu.",
    tabelTerkait: ["po", "poLineItem", "pemetaanPersonelPo", "timesheet"],
  },
  {
    key: "semua",
    label: "RESET TOTAL — semua data di atas sekaligus",
    deskripsi: "Personel, Rate Card, PO, Pemetaan, Pengajuan, dan semua turunannya. Akun login, User XL, Kalender Kerja TETAP ADA.",
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
    if (total === 0) { alert("Tidak ada data di kategori ini."); return; }
    if (kategoriItem.butuhKetik && ketikan[kategoriItem.key] !== "HAPUS") {
      alert('Ketik "HAPUS" (huruf besar semua) dulu di kotak konfirmasi untuk kategori ini.');
      return;
    }
    if (!window.confirm(`Yakin hapus semua data kategori "${kategoriItem.label}"? Total sekitar ${total} baris akan dihapus. Aksi ini TIDAK BISA DIBATALKAN.`)) return;

    setLoading(kategoriItem.key);
    const res = await fetch("/api/kelola-data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kategori: kategoriItem.key }),
    });
    const d = await res.json().catch(() => ({}));
    setLoading(null);
    if (!res.ok) { alert(d.error ?? "Gagal menghapus."); return; }
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
                <p style={{ margin: "6px 0 0", fontSize: 13 }}>Total baris saat ini: <b>{total}</b></p>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
                {k.butuhKetik && (
                  <input
                    placeholder='Ketik "HAPUS"'
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
                  {loading === k.key ? "Menghapus..." : "Hapus Semua"}
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
