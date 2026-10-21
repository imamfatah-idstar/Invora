"use client";

import { useState, useEffect } from "react";

export type MenuItem = {
  href: string;
  label: string;
  deskripsi: string;
  icon?: string;
};

type Props = {
  user: { nama: string; role: string };
  menu: MenuItem[];
};

export default function DashboardView({ user, menu }: Props) {
  const [buka, setBuka] = useState(true);

  // Ambil preferensi buka/tutup dari localStorage saat pertama kali dimuat
  useEffect(() => {
    try {
      const tersimpan = localStorage.getItem("invora_dashboard_sidebar");
      if (tersimpan !== null) {
        setBuka(tersimpan === "true");
      }
    } catch {}
  }, []);

  function toggleSidebar() {
    setBuka((prev) => {
      const baru = !prev;
      try {
        localStorage.setItem("invora_dashboard_sidebar", String(baru));
      } catch {}
      return baru;
    });
  }

  return (
    <div className="admin-shell">
      {/* Sidebar Navigasi yang bisa buka/tutup */}
      <nav className={`admin-sidebar ${buka ? "" : "collapsed"}`} aria-label="Sidebar Menu">
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "4px 8px 12px",
          borderBottom: "1px solid var(--color-border)",
          marginBottom: 10
        }}>
          <h3 style={{ margin: 0, padding: 0, fontSize: 12, fontWeight: 700 }}>Daftar Isi</h3>
          <button
            type="button"
            onClick={toggleSidebar}
            title="Tutup sidebar"
            style={{
              background: "transparent",
              border: "1px solid var(--color-border)",
              borderRadius: 6,
              cursor: "pointer",
              padding: "4px 8px",
              fontSize: 12,
              display: "flex",
              alignItems: "center",
              gap: 4,
              color: "var(--color-text-muted)"
            }}
          >
            <span>◀</span>
            <span>Tutup</span>
          </button>
        </div>

        <ul className="admin-nav">
          {menu.map((m) => (
            <li key={m.href}>
              <a href={m.href}>
                {m.icon && <span style={{ fontSize: 16 }}>{m.icon}</span>}
                <span style={{ fontWeight: 500 }}>{m.label}</span>
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {/* Konten Utama */}
      <main className="admin-content">
        {/* Tombol Toggle Buka/Tutup Sidebar di atas konten */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <button
            type="button"
            onClick={toggleSidebar}
            className="btn"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "7px 14px",
              fontSize: 13,
              fontWeight: 600,
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              borderRadius: 8,
              boxShadow: "var(--shadow-sm)",
              cursor: "pointer",
            }}
            title={buka ? "Sembunyikan Sidebar" : "Buka Sidebar"}
          >
            <span style={{ fontSize: 15 }}>☰</span>
            <span>{buka ? "Sembunyikan Menu" : "Buka Menu"}</span>
          </button>
        </div>

        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 6px 0", color: "#111827" }}>
            Halo, {user.nama}
          </h1>
          <p className="subtitle" style={{ margin: 0 }}>
            Selamat datang di <b>INVORA</b> (Invoice Operations &amp; Revenue Assurance) &middot; IDStar Group.
          </p>
        </div>

        {/* Kartu Navigasi Utama */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: 16,
          marginTop: 8
        }}>
          {menu.map((m) => (
            <a
              key={m.href}
              href={m.href}
              className="card"
              style={{
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                padding: 20,
                borderRadius: 12,
                transition: "all 0.15s ease",
                border: "1px solid var(--color-border)"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "var(--color-primary)";
                e.currentTarget.style.boxShadow = "var(--shadow-md)";
                e.currentTarget.style.transform = "translateY(-2px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--color-border)";
                e.currentTarget.style.boxShadow = "var(--shadow-sm)";
                e.currentTarget.style.transform = "none";
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  {m.icon && <span style={{ fontSize: 24 }}>{m.icon}</span>}
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#111827" }}>{m.label}</h3>
                </div>
                <p className="subtitle" style={{ marginBottom: 0, fontSize: 13, lineHeight: 1.5 }}>
                  {m.deskripsi}
                </p>
              </div>
              <div style={{
                marginTop: 18,
                fontSize: 13,
                fontWeight: 600,
                color: "var(--color-primary)",
                display: "flex",
                alignItems: "center",
                gap: 4
              }}>
                Buka Modul <span>&rarr;</span>
              </div>
            </a>
          ))}
        </div>
      </main>
    </div>
  );
}
