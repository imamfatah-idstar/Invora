import { NextRequest, NextResponse } from "next/server";
import { userSaatIni } from "@/lib/session-server";
import { verifikasiKoneksiSMTP } from "@/lib/email-service";
import nodemailer from "nodemailer";

export async function GET() {
  const user = await userSaatIni();
  if (!user || !user.roles.includes("admin")) {
    return NextResponse.json({ error: "Hanya Admin yang dapat menguji koneksi SMTP" }, { status: 403 });
  }

  const hasil = await verifikasiKoneksiSMTP();
  return NextResponse.json(hasil);
}

export async function POST(request: NextRequest) {
  const user = await userSaatIni();
  if (!user || !user.roles.includes("admin")) {
    return NextResponse.json({ error: "Hanya Admin yang dapat mengirim email uji coba" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const emailTujuan = body.email || user.email;

  if (!emailTujuan) {
    return NextResponse.json({ error: "Email tujuan wajib diisi" }, { status: 400 });
  }

  const service = process.env.SMTP_SERVICE;
  const smtpUser = process.env.SMTP_USER || process.env.EMAIL_USER;
  const pass = process.env.SMTP_PASS || process.env.EMAIL_PASS;
  const host = process.env.SMTP_HOST || (service === "gmail" || smtpUser?.includes("@gmail.com") ? "smtp.gmail.com" : undefined);
  const port = Number(process.env.SMTP_PORT) || (host === "smtp.gmail.com" ? 465 : 587);
  const secure = process.env.SMTP_SECURE ? process.env.SMTP_SECURE === "true" : port === 465;
  const from = process.env.SMTP_FROM || `"INVORA IDStar" <${smtpUser || "noreply@idstar.group"}>`;

  if ((!host && !service) || !smtpUser || !pass) {
    return NextResponse.json(
      { error: "Konfigurasi SMTP di .env atau Vercel belum lengkap (butuh SMTP_USER & SMTP_PASS)." },
      { status: 400 }
    );
  }

  try {
    const transporter = service
      ? nodemailer.createTransport({ service, auth: { user: smtpUser, pass } })
      : nodemailer.createTransport({
          host,
          port,
          secure,
          auth: { user: smtpUser, pass },
          tls: { rejectUnauthorized: false },
        });

    const info = await transporter.sendMail({
      from,
      to: emailTujuan,
      subject: "🧪 Tes Pengiriman Email SMTP — INVORA IDStar",
      html: `
        <div style="font-family: sans-serif; padding: 20px; color: #1e293b;">
          <h2 style="color: #ea242a;">✓ Tes Koneksi SMTP Berhasil!</h2>
          <p>Halo,</p>
          <p>Email ini dikirim otomatis untuk menguji bahwa konfigurasi SMTP server di <b>INVORA IDStar</b> telah aktif dan berfungsi dengan sempurna.</p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">
          <p style="font-size: 12px; color: #64748b;">
            Dikirim oleh: ${user.nama} (${user.email})<br>
            Waktu: ${new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })} WIB
          </p>
        </div>
      `,
    });

    return NextResponse.json({
      sukses: true,
      message: `Email uji coba berhasil dikirim ke ${emailTujuan}`,
      messageId: info.messageId,
    });
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : "Gagal mengirim email uji coba";
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}

