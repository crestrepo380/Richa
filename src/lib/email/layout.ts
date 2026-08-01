/**
 * Branded, responsive HTML email shell. Email clients are stuck in ~2003 CSS,
 * so this uses inline styles and table-free centered layout that renders
 * consistently across Gmail, Outlook, and Apple Mail. Everything the caller
 * supplies is already-rendered HTML.
 */

export interface EmailShellOptions {
  heading?: string;
  bodyHtml: string;
  preview?: string;
}

const BRAND = "#b91c1c";
const INK = "#0f172a";
const MUTED = "#64748b";
const SURFACE = "#ffffff";
const BG = "#f6f7f9";

export function renderEmailShell({ heading, bodyHtml, preview }: EmailShellOptions): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="color-scheme" content="light">
  </head>
  <body style="margin:0;padding:0;background:${BG};font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
    ${preview ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${preview}</div>` : ""}
    <div style="max-width:560px;margin:0 auto;padding:24px 16px;">
      <div style="text-align:left;padding-bottom:16px;">
        <span style="display:inline-block;width:32px;height:32px;line-height:32px;text-align:center;background:${BRAND};color:#fff;font-weight:700;border-radius:8px;">DI</span>
        <span style="font-weight:600;color:${INK};margin-left:8px;vertical-align:middle;">Inventory Portal</span>
      </div>
      <div style="background:${SURFACE};border:1px solid #e2e5ec;border-radius:12px;padding:28px 24px;">
        ${heading ? `<h1 style="margin:0 0 16px;font-size:20px;color:${INK};">${heading}</h1>` : ""}
        <div style="font-size:15px;line-height:1.6;color:${INK};">${bodyHtml}</div>
      </div>
      <p style="text-align:center;font-size:12px;color:${MUTED};margin-top:20px;">
        You're receiving this because your dealership uses the Inventory Portal.
      </p>
    </div>
  </body>
</html>`;
}

/** An email-safe primary button (table-based for Outlook). */
export function emailButton(label: string, href: string): string {
  return `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:20px 0;">
    <tr>
      <td style="border-radius:8px;background:${BRAND};">
        <a href="${href}" style="display:inline-block;padding:12px 24px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">${label}</a>
      </td>
    </tr>
  </table>`;
}
