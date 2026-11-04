/**
 * Konversi angka nominal uang Rupiah menjadi teks terbilang bahasa Indonesia resmi.
 * Contoh: 33333333 -> "Tiga Puluh Tiga Juta Tiga Ratus Tiga Puluh Tiga Ribu Tiga Ratus Tiga Puluh Tiga Rupiah"
 */
export function terbilang(n: number): string {
  const bilangan = [
    "",
    "Satu",
    "Dua",
    "Tiga",
    "Empat",
    "Lima",
    "Enam",
    "Tujuh",
    "Delapan",
    "Sembilan",
    "Sepuluh",
    "Sebelas",
  ];

  const bulat = Math.floor(Math.abs(n));
  if (bulat === 0) return "Nol Rupiah";

  function konversi(angka: number): string {
    if (angka < 12) {
      return bilangan[angka];
    } else if (angka < 20) {
      return konversi(angka - 10) + " Belas";
    } else if (angka < 100) {
      const sisa = angka % 10;
      return konversi(Math.floor(angka / 10)) + " Puluh" + (sisa ? " " + konversi(sisa) : "");
    } else if (angka < 200) {
      const sisa = angka - 100;
      return "Seratus" + (sisa ? " " + konversi(sisa) : "");
    } else if (angka < 1000) {
      const sisa = angka % 100;
      return konversi(Math.floor(angka / 100)) + " Ratus" + (sisa ? " " + konversi(sisa) : "");
    } else if (angka < 2000) {
      const sisa = angka - 1000;
      return "Seribu" + (sisa ? " " + konversi(sisa) : "");
    } else if (angka < 1000000) {
      const sisa = angka % 1000;
      return konversi(Math.floor(angka / 1000)) + " Ribu" + (sisa ? " " + konversi(sisa) : "");
    } else if (angka < 1000000000) {
      const sisa = angka % 1000000;
      return konversi(Math.floor(angka / 1000000)) + " Juta" + (sisa ? " " + konversi(sisa) : "");
    } else if (angka < 1000000000000) {
      const sisa = angka % 1000000000;
      return konversi(Math.floor(angka / 1000000000)) + " Miliar" + (sisa ? " " + konversi(sisa) : "");
    } else {
      const sisa = angka % 1000000000000;
      return konversi(Math.floor(angka / 1000000000000)) + " Triliun" + (sisa ? " " + konversi(sisa) : "");
    }
  }

  return konversi(bulat).trim() + " Rupiah";
}

