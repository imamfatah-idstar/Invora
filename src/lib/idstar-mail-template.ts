export interface IdstarMailData {
  klien: string;
  periode: string; // e.g. "2026-10" or "Oct/2026"
  nomorInvoice: string;
  tanggalInvoice: string; // e.g. "2026-10-14" or "14 Oct 2026"
  tanggalJatuhTempo: string; // e.g. "2026-11-15" or "15-Nov-26"
  netAmount: number; // e.g. 108956400
  dueStatus?: "Upcoming" | "Overdue" | "Due Today" | string;
  invoiceCount?: number;
  monthYear?: string; // e.g. "November 2026"
  baseUrl?: string;
}

const MONTH_NAMES_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

const MONTH_NAMES_FULL = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

/**
 * Formats "2026-10" -> "Oct/2026"
 */
export function formatPeriodeShort(periodeStr: string): string {
  if (!periodeStr) return "-";
  if (periodeStr.includes("/")) return periodeStr;
  const parts = periodeStr.split("-");
  if (parts.length >= 2) {
    const year = parts[0];
    const mIdx = parseInt(parts[1], 10) - 1;
    if (mIdx >= 0 && mIdx < 12) {
      return `${MONTH_NAMES_SHORT[mIdx]}/${year}`;
    }
  }
  return periodeStr;
}

/**
 * Formats "2026-10-14" -> "14 Oct 2026"
 */
export function formatInvoiceDateEnglish(dateStr: string): string {
  if (!dateStr) return "-";
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    const day = parseInt(parts[2], 10);
    const mIdx = parseInt(parts[1], 10) - 1;
    const year = parts[0];
    if (mIdx >= 0 && mIdx < 12) {
      return `${day} ${MONTH_NAMES_SHORT[mIdx]} ${year}`;
    }
  }
  return dateStr;
}

/**
 * Formats "2026-11-15" -> "15-Nov-26"
 */
export function formatDueDateShort(dateStr: string): string {
  if (!dateStr) return "-";
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    const day = parts[2].padStart(2, "0");
    const mIdx = parseInt(parts[1], 10) - 1;
    const yearShort = parts[0].slice(-2);
    if (mIdx >= 0 && mIdx < 12) {
      return `${day}-${MONTH_NAMES_SHORT[mIdx]}-${yearShort}`;
    }
  }
  return dateStr;
}

/**
 * Formats due month & year e.g. "November 2026"
 */
export function formatDueMonthYear(dateStr: string): string {
  if (!dateStr) return "-";
  const parts = dateStr.split("-");
  if (parts.length >= 2) {
    const mIdx = parseInt(parts[1], 10) - 1;
    const year = parts[0];
    if (mIdx >= 0 && mIdx < 12) {
      return `${MONTH_NAMES_FULL[mIdx]} ${year}`;
    }
  }
  return dateStr;
}

/**
 * Formats integer with thousands commas e.g. 108956400 -> "108,956,400"
 */
export function formatAmountNumber(val: number): string {
  return Math.round(val).toLocaleString("en-US");
}

/**
 * Determines due status string based on dates
 */
export function determineDueStatus(dueDateStr: string): string {
  if (!dueDateStr) return "Upcoming";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dueDateStr + "T00:00:00Z");
  if (isNaN(target.getTime())) return "Upcoming";

  const diffDays = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return "Overdue";
  if (diffDays === 0) return "Due Today";
  return "Upcoming";
}

/**
 * Generates the official IDStar Email Template matching IDstar-Group-Mail.png
 */
export function generateIdstarEmailTemplate(data: IdstarMailData): {
  subject: string;
  html: string;
  plainText: string;
} {
  const count = data.invoiceCount ?? 1;
  const countWord = count === 1 ? "1 invoice" : `${count} invoices`;
  const countHeading = count === 1 ? "1 invoice" : `${count} invoices`;
  
  const dueMonthYear = data.monthYear || formatDueMonthYear(data.tanggalJatuhTempo);
  const subject = `${data.klien}_${dueMonthYear.split(" ")[0]}_Outstanding Invoice`;

  const periodeShort = formatPeriodeShort(data.periode);
  const invoiceDate = formatInvoiceDateEnglish(data.tanggalInvoice);
  const dueDateShort = formatDueDateShort(data.tanggalJatuhTempo);
  const status = data.dueStatus || determineDueStatus(data.tanggalJatuhTempo);
  const amountStr = formatAmountNumber(data.netAmount);

  // Logo URL (can be hosted on production or referenced via data/CDN)
  const logoUrl = data.baseUrl
    ? `${data.baseUrl.replace(/\/$/, "")}/idstar-logo-color.png`
    : "https://invora-iota.vercel.app/idstar-logo-color.png";

  const plainText = `Subject: ${subject}

You have ${countHeading} due
------------------------------------------------------------
Dear ${data.klien}

Thank you for choosing us for your business partner.

We would like to confirm that you have ${count} invoice due in ${dueMonthYear} for a total of IDR ${amountStr}.

============================================================
INVOICE SUMMARY TABLE
============================================================
No | Invoice Periode | Invoice Due Status | Invoice Number | Invoice Date | Net Amount (IDR) | Payment Due Date
1  | ${periodeShort}        | ${status}           | ${data.nomorInvoice} | ${invoiceDate} | ${amountStr} | ${dueDateShort}
============================================================

Please check to make sure everything looks all right.
If you have made a payment, please send proof of payment to finance@idstar.group
If you are not the right person to receive this reminder, please contact us at finance@idstar.group

This is an automated email from IDStar

------------------------------------------------------------
The Bellagio Mansion
Jl. Mega Kuningan Timur
Kota Jakarta Selatan
© PT IDStar Cipta Teknologi
------------------------------------------------------------
This email and any attachments are confidential and intended solely for the use of the individual or entity to whom they are addressed. If you have received this email in error, please notify the sender immediately and delete it from your system. Any unauthorized use, disclosure, or distribution of this email and its attachments is strictly prohibited.`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 24px 12px; background-color: #f9fafb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1f2937;">
  <div style="max-width: 680px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 6px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
    
    <!-- Header Logo -->
    <div style="padding: 28px 24px 18px; text-align: center;">
      <img src="${logoUrl}" alt="IDStar - Service with Quality" height="48" style="height: 48px; width: auto; max-width: 220px; display: inline-block;" />
      <div style="margin-top: 18px; border-bottom: 1px solid #e5e7eb;"></div>
    </div>

    <!-- Main Title -->
    <div style="text-align: center; padding: 4px 20px 20px;">
      <h1 style="margin: 0; color: #b91c1c; font-family: Georgia, 'Times New Roman', serif; font-size: 26px; font-weight: 700; letter-spacing: -0.3px;">
        You have ${countHeading} due
      </h1>
    </div>

    <!-- Content Card -->
    <div style="margin: 0 24px 24px; border: 1px solid #d1d5db; border-radius: 4px; padding: 24px 26px; background-color: #ffffff;">
      <div style="font-size: 13.5px; font-weight: 700; color: #111827; margin-bottom: 12px;">
        Dear ${data.klien}
      </div>

      <div style="font-size: 13px; color: #374151; margin-bottom: 12px;">
        Thank you for choosing us for your business partner.
      </div>

      <div style="font-size: 13px; color: #374151; margin-bottom: 22px; line-height: 1.5;">
        We would like to confirm that you have <b>${count}</b> invoice due in <b>${dueMonthYear}</b> for a total of <b>IDR ${amountStr}</b>.
      </div>

      <!-- Invoice Table -->
      <table style="width: 100%; border-collapse: collapse; font-size: 11px; margin: 16px 0; color: #111827; border: 1px solid #6b7280;">
        <thead>
          <tr style="background-color: #e5e7eb;">
            <th style="border: 1px solid #6b7280; padding: 8px 6px; text-align: center; font-weight: 700;">No</th>
            <th style="border: 1px solid #6b7280; padding: 8px 6px; text-align: center; font-weight: 700;">Invoice Periode</th>
            <th style="border: 1px solid #6b7280; padding: 8px 6px; text-align: center; font-weight: 700;">Invoice Due Status</th>
            <th style="border: 1px solid #6b7280; padding: 8px 6px; text-align: center; font-weight: 700;">Invoice Number</th>
            <th style="border: 1px solid #6b7280; padding: 8px 6px; text-align: center; font-weight: 700;">Invoice Date</th>
            <th style="border: 1px solid #6b7280; padding: 8px 6px; text-align: center; font-weight: 700;">Net Amount<br/>(IDR)</th>
            <th style="border: 1px solid #6b7280; padding: 8px 6px; text-align: center; font-weight: 700;">Payment Due Date</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="border: 1px solid #6b7280; padding: 10px 6px; text-align: center;">1</td>
            <td style="border: 1px solid #6b7280; padding: 10px 6px; text-align: center;">${periodeShort}</td>
            <td style="border: 1px solid #6b7280; padding: 10px 6px; text-align: center; font-weight: 600; color: ${status === 'Overdue' ? '#b91c1c' : '#111827'};">${status}</td>
            <td style="border: 1px solid #6b7280; padding: 10px 6px; text-align: center; font-weight: 600;">${data.nomorInvoice}</td>
            <td style="border: 1px solid #6b7280; padding: 10px 6px; text-align: center;">${invoiceDate}</td>
            <td style="border: 1px solid #6b7280; padding: 10px 6px; text-align: right; font-weight: 600; font-family: 'Courier New', monospace;">${amountStr}</td>
            <td style="border: 1px solid #6b7280; padding: 10px 6px; text-align: center;">${dueDateShort}</td>
          </tr>
        </tbody>
      </table>

      <!-- Client Instructions -->
      <div style="margin-top: 24px; text-align: center; font-size: 12.5px; color: #1f2937; line-height: 1.6;">
        <div style="margin-bottom: 6px;">Please check to make sure everything looks all right.</div>
        <div style="margin-bottom: 6px;">If you have made a payment, please send proof of payment to <a href="mailto:finance@idstar.group" style="color: #2563eb; text-decoration: underline;">finance@idstar.group</a></div>
        <div style="margin-bottom: 18px;">If you are not the right person to receive this reminder, please contact us at <a href="mailto:finance@idstar.group" style="color: #2563eb; text-decoration: underline;">finance@idstar.group</a></div>
        
        <div style="border-top: 1px solid #e5e7eb; margin: 16px auto; width: 85%;"></div>
        <div style="font-style: italic; font-size: 11.5px; color: #4b5563;">This is an automated email from IDStar</div>
      </div>
    </div>

    <!-- Red Footer Banner -->
    <div style="background-color: #b91c1c; color: #ffffff; text-align: center; padding: 18px 20px; font-size: 11.5px; line-height: 1.5;">
      <div style="font-weight: 700; margin-bottom: 2px;">The Bellagio Mansion</div>
      <div>Jl. Mega Kuningan Timur</div>
      <div>Kota Jakarta Selatan</div>
      <div style="margin-top: 6px; font-size: 11px; opacity: 0.95;">&copy; PT IDStar Cipta Teknologi</div>
    </div>

  </div>

  <!-- Confidentiality Notice -->
  <div style="max-width: 680px; margin: 16px auto 0; font-size: 10px; color: #6b7280; line-height: 1.45; font-style: italic; padding: 0 8px;">
    This email and any attachments are confidential and intended solely for the use of the individual or entity to whom they are addressed. If you have received this email in error, please notify the sender immediately and delete it from your system. Any unauthorized use, disclosure, or distribution of this email and its attachments is strictly prohibited.
  </div>
</body>
</html>`;

  return {
    subject,
    html,
    plainText,
  };
}
