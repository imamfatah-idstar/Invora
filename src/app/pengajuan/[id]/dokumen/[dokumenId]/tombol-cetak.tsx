"use client";
export default function TombolCetak() {
  return (
    <button onClick={() => window.print()} className="btn btn-primary no-print">
      Cetak / Simpan sebagai PDF
    </button>
  );
}
