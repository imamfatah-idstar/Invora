import nodemailer from "nodemailer";

export interface KirimEmailResetParams {
  email: string;
  nama: string;
  resetUrl: string;
  token: string;
}

export async function kirimEmailResetPassword({
  email,
  nama,
  resetUrl,
}: KirimEmailResetParams): Promise<{ sukses: boolean; error?: string; devPreviewUrl?: string }> {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT) || 587;
  const user = process.env.SMTP_USER || process.env.EMAIL_USER;
  const pass = process.env.SMTP_PASS || process.env.EMAIL_PASS;
  const from = process.env.SMTP_FROM || `"INVORA IDStar" <noreply@idstar.group>`;

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Reset Kata Sandi — INVORA IDStar</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
    .container { max-width: 540px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
    .header { background: #ea242a; padding: 24px; text-align: center; }
    .header h1 { margin: 0; color: #ffffff; font-size: 20px; font-weight: 800; letter-spacing: 0.05em; }
    .header p { margin: 4px 0 0; color: rgba(255,255,255,0.85); font-size: 12px; }
    .body { padding: 32px 28px; }
    .greeting { font-size: 16px; font-weight: 700; color: #0f172a; margin-bottom: 12px; }
    .text { font-size: 14px; line-height: 1.6; color: #475569; margin-bottom: 24px; }
    .btn-container { text-align: center; margin: 32px 0; }
    .btn { display: inline-block; background-color: #ea242a; color: #ffffff !important; text-decoration: none; padding: 12px 28px; font-size: 14px; font-weight: 700; border-radius: 8px; box-shadow: 0 2px 4px rgba(234,36,42,0.25); }
    .link-alt { font-size: 12px; color: #64748b; word-break: break-all; line-height: 1.5; background: #f1f5f9; padding: 12px; border-radius: 6px; }
    .footer { padding: 20px 28px; background: #f8fafc; border-top: 1px solid #f1f5f9; font-size: 12px; color: #94a3b8; text-align: center; line-height: 1.5; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🧾 INVORA</h1>
      <p>Invoice Operations &amp; Revenue Assurance &middot; IDStar Group</p>
    </div>
    <div class="body">
      <div class="greeting">Halo, ${nama || "Pengguna IDStar"}</div>
      <div class="text">
        Kami menerima permintaan untuk mengatur ulang kata sandi akun INVORA Anda (<b>${email}</b>).
        Silakan klik tombol di bawah ini untuk membuat kata sandi baru:
      </div>
      <div class="btn-container">
        <a href="${resetUrl}" class="btn" target="_blank">Atur Kata Sandi Baru</a>
      </div>
      <div class="text" style="font-size: 13px; margin-bottom: 8px;">
        Atau salin tautan verifikasi ini ke browser Anda:
      </div>
      <div class="link-alt">${resetUrl}</div>
      <div class="text" style="font-size: 12.5px; color: #64748b; margin-top: 24px; margin-bottom: 0;">
        ⚠️ <i>Tautan ini hanya berlaku selama <b>60 menit</b>. Jika Anda tidak melakukan permintaan ini, abaikan email ini dan akun Anda tetap aman.</i>
      </div>
    </div>
    <div class="footer">
      PT IDSTAR CIPTA TEKNOLOGI<br>
      The Bellagio Mansion, Ground Floor, Mega Kuningan, Jakarta Selatan 12950<br>
      Email ini dikirim otomatis oleh sistem keamanan INVORA.
    </div>
  </div>
</body>
</html>
`;

  // Jika konfigurasi SMTP tersedia
  if (host && user && pass) {
    try {
      const transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      });

      await transporter.sendMail({
        from,
        to: email,
        subject: "Atur Ulang Kata Sandi Akun INVORA IDStar",
        text: `Halo ${nama},\n\nPermintaan atur ulang kata sandi akun INVORA (${email}). Kunjungi tautan berikut:\n${resetUrl}\n\nTautan berlaku 60 menit.`,
        html: htmlContent,
      });

      return { sukses: true };
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Gagal mengirim email via SMTP";
      console.error("[EmailService] SMTP error:", errMsg);
      return { sukses: false, error: errMsg, devPreviewUrl: resetUrl };
    }
  }

  // Jika SMTP belum dikonfigurasi di environment, sediakan direct devPreviewUrl
  console.log(`[EmailService] SMTP belum diset. Token reset untuk ${email}: ${resetUrl}`);
  return {
    sukses: true,
    devPreviewUrl: resetUrl,
  };
}

