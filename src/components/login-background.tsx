"use client";
import { useEffect, useRef } from "react";

// Background animasi "Skyline Pulse" untuk halaman login — gedung pencakar
// langit (gaya siluet kota besar, kombinasi atap datar/antena/bertingkat
// piramida biar terlihat seperti skyline sungguhan, bukan kotak-kotak polos),
// jendela berkedip, dan satu invoice yang terbang lalu berubah jadi koin emas
// yang jatuh. TANPA teks apa pun — murni animasi, sesuai permintaan pengguna.
// CSS di globals.css (namespace .login-bg-*). Dibangun murni CSS/JS, tanpa
// dependency animasi eksternal. Lihat PROJECT_INSTRUCTIONS.md bagian 29.
function acak(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

type AtapJenis = "datar" | "antena" | "bertingkat" | "lancip";

function buatGedung(tinggiPersen: number, warnaLatar: boolean): HTMLDivElement {
  const bldg = document.createElement("div");
  bldg.className = "login-bg-bldg";
  bldg.style.width = acak(3.2, 6.5) + "%";
  bldg.style.height = tinggiPersen + "%";

  const jenisAtap: AtapJenis[] = ["datar", "datar", "antena", "bertingkat", "lancip"];
  const atap = jenisAtap[Math.floor(Math.random() * jenisAtap.length)];

  if (!warnaLatar) {
    if (atap === "antena") {
      const antena = document.createElement("div");
      antena.className = "login-bg-top-antenna";
      bldg.appendChild(antena);
    } else if (atap === "bertingkat") {
      let lebar = 70;
      for (let t = 0; t < 3; t++) {
        const tier = document.createElement("div");
        tier.className = "login-bg-top-tier";
        lebar -= 18;
        tier.style.width = lebar + "%";
        tier.style.height = "8px";
        tier.style.bottom = "100%";
        tier.style.marginBottom = t * 8 + "px";
        bldg.appendChild(tier);
      }
    } else if (atap === "lancip") {
      const puncak = document.createElement("div");
      puncak.className = "login-bg-top-point";
      bldg.appendChild(puncak);
    }
  }

  // Jendela + kedip (hanya di layar depan supaya tidak terlalu ramai/berat)
  if (!warnaLatar) {
    const kolom = Math.max(2, Math.floor(acak(2, 5)));
    const baris = Math.max(3, Math.floor(tinggiPersen / 8));
    for (let r = 0; r < baris; r++) {
      for (let c = 0; c < kolom; c++) {
        if (Math.random() < 0.2) continue; // beberapa jendela kosong/gelap total
        const win = document.createElement("div");
        const nyala = Math.random() < 0.4;
        win.className = "login-bg-win" + (nyala ? " lit" : "");
        win.style.left = (10 + c * (80 / kolom)) + "%";
        win.style.bottom = (6 + r * 8) + "%";
        if (nyala) win.style.animationDelay = acak(0, 4.5) + "s";
        bldg.appendChild(win);
      }
    }
  }

  return bldg;
}

export default function LoginBackground() {
  const belakangRef = useRef<HTMLDivElement>(null);
  const depanRef = useRef<HTMLDivElement>(null);
  const terbangRef = useRef<HTMLDivElement>(null);
  const built = useRef(false);

  useEffect(() => {
    if (built.current) return;
    built.current = true;

    if (belakangRef.current) {
      const n = 14;
      for (let i = 0; i < n; i++) {
        belakangRef.current.appendChild(buatGedung(acak(15, 45), true));
      }
    }
    if (depanRef.current) {
      const n = 15;
      for (let i = 0; i < n; i++) {
        depanRef.current.appendChild(buatGedung(acak(25, 82), false));
      }
    }
    if (terbangRef.current) {
      for (let i = 0; i < 2; i++) {
        const inv = document.createElement("div");
        inv.className = "login-bg-invoice";
        inv.style.animationDuration = "8s";
        inv.style.animationDelay = (i === 0 ? 0 : -4) + "s";
        terbangRef.current.appendChild(inv);

        for (let k = 0; k < 4; k++) {
          const koin = document.createElement("div");
          koin.className = "login-bg-coin";
          koin.style.left = (76 + acak(-2, 8)) + "%";
          koin.style.bottom = "34%";
          koin.style.animationDuration = "8s";
          koin.style.animationDelay = ((i === 0 ? 0 : -4) + k * 0.15) + "s";
          terbangRef.current.appendChild(koin);
        }
      }
    }
  }, []);

  return (
    <div className="login-bg" aria-hidden="true">
      <div className="login-bg-buildings-back" ref={belakangRef} />
      <div className="login-bg-buildings-front" ref={depanRef} />
      <div ref={terbangRef} />
    </div>
  );
}
