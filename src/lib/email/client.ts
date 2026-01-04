import { Resend } from 'resend';

export const resend = new Resend(process.env.RESEND_API_KEY);

export const EMAIL_FROM = process.env.EMAIL_FROM || 'noreply@example.com';
export const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@example.com';
