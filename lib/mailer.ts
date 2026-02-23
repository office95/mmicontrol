import nodemailer from 'nodemailer';

const host = process.env.SMTP_HOST;
const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587;
const user = process.env.SMTP_USER;
const pass = process.env.SMTP_PASS;
const from = process.env.SMTP_FROM || user;

let transporter: nodemailer.Transporter | null = null;

function getTransport() {
  if (!host || !user || !pass) {
    console.warn('mail skipped: SMTP env not complete');
    return null;
  }
  if (transporter) return transporter;
  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
  return transporter;
}

export async function sendMail(opts: {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
}) {
  const t = getTransport();
  if (!t || !from) return { ok: false, skipped: true, reason: 'missing transport or from' };
  try {
    await t.sendMail({ from, ...opts });
    return { ok: true };
  } catch (e) {
    console.error('mail error', e);
    return { ok: false, error: (e as Error).message };
  }
}
