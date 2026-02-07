import { Resend } from 'resend';

import { env } from '../config/env.js';
import { ActivationInviteEmailInput, ResetPasswordEmailInput } from '../types/email.types.js';

export async function sendActivationInviteEmail(input: ActivationInviteEmailInput) {
  if (env.MAIL_PROVIDER === 'disabled') {
    console.warn('[mail] envio ignorado: MAIL_PROVIDER=disabled', {
      to: input.to,
      type: 'activation',
    });
    return;
  }

  const activationLink = createAppLink(env.APP_ACTIVATION_PATH, input.token);
  const subject = 'Ativação de conta Handsell';
  const text = [
    `Olá, ${input.fullName}.`,
    '',
    'Recebemos um cadastro para seu acesso no Portal Handsell.',
    `Ative sua conta no link: ${activationLink}`,
    '',
    'Se você não reconhece este cadastro, ignore este e-mail.',
  ].join('\n');

  const html = [
    `<p>Olá, ${escapeHtml(input.fullName)}.</p>`,
    '<p>Recebemos um cadastro para seu acesso no Portal Handsell.</p>',
    `<p><a href="${activationLink}">Clique aqui para ativar sua conta</a></p>`,
    '<p>Se você não reconhece este cadastro, ignore este e-mail.</p>',
  ].join('');

  await sendEmail(input.to, subject, html, text);
}

export async function sendResetPasswordEmail(input: ResetPasswordEmailInput) {
  if (env.MAIL_PROVIDER === 'disabled') {
    console.warn('[mail] envio ignorado: MAIL_PROVIDER=disabled', {
      to: input.to,
      type: 'reset-password',
    });
    return;
  }

  const resetLink = createAppLink(env.APP_RESET_PASSWORD_PATH, input.token);
  const subject = 'Recuperação de senha Handsell';
  const text = [
    `Olá, ${input.fullName}.`,
    '',
    'Recebemos um pedido para redefinir sua senha.',
    `Redefina no link: ${resetLink}`,
    '',
    'Se você não solicitou, ignore este e-mail.',
  ].join('\n');

  const html = [
    `<p>Olá, ${escapeHtml(input.fullName)}.</p>`,
    '<p>Recebemos um pedido para redefinir sua senha.</p>',
    `<p><a href="${resetLink}">Clique aqui para redefinir sua senha</a></p>`,
    '<p>Se você não solicitou, ignore este e-mail.</p>',
  ].join('');

  await sendEmail(input.to, subject, html, text);
}

async function sendEmail(to: string, subject: string, html: string, text: string) {
  const resend = getResendClient();
  const result = await resend.emails.send({
    from: getMailFrom(),
    to,
    subject,
    html,
    text,
  });

  if (result.error) {
    throw new Error(`Falha ao enviar e-mail via Resend: ${result.error.message}`);
  }

  console.info('[mail] e-mail enviado com sucesso', {
    to,
    subject,
    id: result.data?.id,
  });
}

function getResendClient() {
  if (!env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY nao configurada');
  }

  return new Resend(env.RESEND_API_KEY);
}

function getMailFrom() {
  if (!env.MAIL_FROM) {
    throw new Error('MAIL_FROM nao configurado');
  }

  return env.MAIL_FROM;
}

function createAppLink(path: string, token: string) {
  if (!env.APP_WEB_URL) {
    throw new Error('APP_WEB_URL nao configurada');
  }

  const baseUrl = env.APP_WEB_URL.endsWith('/') ? env.APP_WEB_URL.slice(0, -1) : env.APP_WEB_URL;
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  return `${baseUrl}${normalizedPath}?token=${encodeURIComponent(token)}`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
