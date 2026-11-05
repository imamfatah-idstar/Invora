"use client";
export default function TombolCetak() {
  return (
    <button onClick={() => window.print()} className="btn btn-primary no-print">
      Print / Save as PDF
    </button>
  );
}
