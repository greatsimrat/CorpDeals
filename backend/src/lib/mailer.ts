import sgMail from '@sendgrid/mail';

const apiKey = process.env.SENDGRID_API_KEY || '';
const fromEmail = process.env.SENDGRID_FROM_EMAIL || '';
const fromName = process.env.SENDGRID_FROM_NAME || 'CorpDeals';

const isConfigured = Boolean(apiKey && fromEmail);

if (isConfigured) {
  sgMail.setApiKey(apiKey);
}

export const canSendEmail = () => isConfigured;

interface VerificationEmailInput {
  to: string;
  code: string;
  companyName: string;
  expiresAt: Date;
}

export const sendVerificationCodeEmail = async ({
  to,
  code,
  companyName,
  expiresAt,
}: VerificationEmailInput): Promise<{ sent: boolean; error?: string }> => {
  if (!isConfigured) {
    return { sent: false, error: 'SendGrid not configured' };
  }

  const subject = `Your ${companyName} verification code`;
  const expiresText = expiresAt.toISOString();
  const text = [
    `Your CorpDeals verification code is: ${code}`,
    `This code expires at ${expiresText}.`,
  ].join('\n');
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <h2 style="margin: 0 0 12px;">Verify your employment</h2>
      <p>Your CorpDeals verification code is:</p>
      <p style="font-size: 24px; font-weight: bold; letter-spacing: 2px;">${code}</p>
      <p>This code expires at ${expiresText}.</p>
    </div>
  `;

  try {
    await sgMail.send({
      to,
      from: { email: fromEmail, name: fromName },
      subject,
      text,
      html,
    });
    return { sent: true };
  } catch (error: any) {
    return { sent: false, error: error?.message || 'SendGrid send failed' };
  }
};
