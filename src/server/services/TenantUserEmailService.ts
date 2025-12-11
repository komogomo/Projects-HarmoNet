import { sendEmail } from '@/src/server/services/SesEmailService';
import { logError } from '@/src/lib/logging/log.util';

interface TenantUserRegistrationEmailParams {
  to: string;
  firstName: string; // 苗字 (DB の first_name)
  lastName: string; // 名前 (DB の last_name)
  tenantName?: string | null;
}

const buildTenantUserRegistrationEmailTemplate = (params: {
  fullName: string;
  loginUrl: string;
  tenantName?: string | null;
}): { subject: string; text: string } => {
  const { fullName, loginUrl, tenantName } = params;

  const appLabel = tenantName && tenantName.trim().length > 0 ? `HarmoNet (${tenantName})` : 'HarmoNet';

  const subject = '【HarmoNet】ユーザ登録完了のお知らせ';

  const textLines = [
    `${fullName} 様`,
    '',
    `このメールは、${appLabel} の管理者により、新しくユーザ登録されたことをお知らせするものです。`,
    '',
    '下記のログインページから、登録されたメールアドレスでログインしてください。',
    loginUrl,
    '',
    '※本メールに心当たりがない場合は、このメールを破棄してください。',
  ];

  return {
    subject,
    text: textLines.join('\n'),
  };
};

export const sendTenantUserRegistrationEmail = async (
  params: TenantUserRegistrationEmailParams,
): Promise<void> => {
  const { to, firstName, lastName, tenantName } = params;

  const baseUrl = process.env.APP_BASE_URL;

  if (!baseUrl) {
    logError('email.tenant_user_registration.misconfigured', {
      reason: 'APP_BASE_URL is not set',
    });
    return;
  }

  const normalizedBaseUrl = baseUrl.replace(/\/$/, '');
  const loginUrl = `${normalizedBaseUrl}/login`;

  const fullName = `${firstName}${lastName}`;

  const template = buildTenantUserRegistrationEmailTemplate({
    fullName,
    loginUrl,
    tenantName,
  });

  await sendEmail({
    to,
    subject: template.subject,
    text: template.text,
  });
};
