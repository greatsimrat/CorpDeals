import nodemailer from 'nodemailer';

const mailHost = process.env.MAIL_HOST || '';
const mailPort = Number(process.env.MAIL_PORT || '465');
const mailUsername = process.env.MAIL_USERNAME || '';
const mailPassword = process.env.MAIL_PASSWORD || '';
const mailEncryption = (process.env.MAIL_ENCRYPTION || '').toLowerCase();
const fromEmail = process.env.MAIL_FROM_ADDRESS || mailUsername;
const fromName = process.env.MAIL_FROM_NAME || 'CorpDeals';
const appEnv = (process.env.APP_ENV || '').toLowerCase();
const nodeEnv = (process.env.NODE_ENV || '').toLowerCase();
const devUserConfirmationInbox =
  process.env.USER_CONFIRMATION_TEST_EMAIL ||
  'user@effectiverenovations.com';
const vendorNotificationTestInbox =
  process.env.VENDOR_NOTIFICATION_TEST_EMAIL ||
  'vendor-test@effectiverenovations.com';
const isLocalOrDev = appEnv === 'local' || nodeEnv === 'development';
const vendorOverrideEnabledRaw = (process.env.VENDOR_EMAIL_OVERRIDE_ENABLED || '').toLowerCase();
const vendorOverrideEnabled = vendorOverrideEnabledRaw
  ? ['1', 'true', 'yes'].includes(vendorOverrideEnabledRaw)
  : true;

const isConfigured = Boolean(
  mailHost && mailPort && mailUsername && mailPassword && fromEmail
);

const useSecureTransport =
  mailEncryption === 'ssl' || mailEncryption === 'tls' || mailPort === 465;

const transporter = isConfigured
  ? nodemailer.createTransport({
      host: mailHost,
      port: mailPort,
      secure: useSecureTransport,
      auth: {
        user: mailUsername,
        pass: mailPassword,
      },
    })
  : null;

export const canSendEmail = () => isConfigured;

export const getEmailConfig = () => ({
  configured: isConfigured,
  provider: 'smtp',
  host: mailHost,
  port: mailPort,
  encryption: mailEncryption || (useSecureTransport ? 'ssl' : 'none'),
  fromAddress: fromEmail,
  fromName,
});

export type RoutedEmailType = 'user_confirmation' | 'vendor_lead';

const normalizeEmail = (value: string) => value.trim().toLowerCase();

const isEmailLike = (value: string) =>
  value.includes('@') && value.indexOf('@') > 0 && value.indexOf('@') < value.length - 1;

const resolveEmailRecipient = (
  emailType: RoutedEmailType,
  originalRecipient: string
) => {
  const normalizedOriginal = normalizeEmail(originalRecipient || '');

  let recipient = normalizedOriginal;
  let overridden = false;

  if (isLocalOrDev) {
    if (emailType === 'user_confirmation') {
      recipient = normalizeEmail(devUserConfirmationInbox);
      overridden = recipient !== normalizedOriginal;
    } else if (emailType === 'vendor_lead' && vendorOverrideEnabled) {
      recipient = normalizeEmail(vendorNotificationTestInbox);
      overridden = recipient !== normalizedOriginal;
    }

    console.log('Dev email routing override:', {
      emailType,
      originalRecipient: normalizedOriginal || '(empty)',
      finalRecipient: recipient || '(empty)',
    });
  }

  return {
    recipient,
    originalRecipient: normalizedOriginal,
    overridden,
  };
};

export const resolveVendorNotificationRecipient = (vendorEmail: string) => {
  const route = resolveEmailRecipient('vendor_lead', vendorEmail);
  return {
    actualVendorEmail: route.originalRecipient,
    recipient: route.recipient,
    overridden: route.overridden,
  };
};

interface SendEmailInput {
  emailType?: RoutedEmailType;
  to: string;
  subject: string;
  text: string;
  html: string;
}

export interface SendEmailResult {
  sent: boolean;
  error?: string;
  emailType?: RoutedEmailType;
  originalRecipient: string;
  recipient: string;
}

const appendDevAuditFooter = (
  emailType: RoutedEmailType,
  originalRecipient: string,
  finalRecipient: string,
  text: string,
  html: string
) => {
  const footerText = [
    '',
    '---',
    'DEV ROUTING OVERRIDE',
    `Original recipient: ${originalRecipient || 'N/A'}`,
    `Final recipient: ${finalRecipient || 'N/A'}`,
    `Email type: ${emailType}`,
  ].join('\n');

  const footerHtml = `
    <hr />
    <p><strong>DEV ROUTING OVERRIDE</strong></p>
    <p><strong>Original recipient:</strong> ${originalRecipient || 'N/A'}</p>
    <p><strong>Final recipient:</strong> ${finalRecipient || 'N/A'}</p>
    <p><strong>Email type:</strong> ${emailType}</p>
  `;

  return {
    text: `${text}${footerText}`,
    html: `${html}${footerHtml}`,
  };
};

const sendEmail = async ({
  emailType,
  to,
  subject,
  text,
  html,
}: SendEmailInput): Promise<SendEmailResult> => {
  const normalizedTo = normalizeEmail(to || '');
  const route =
    emailType && (emailType === 'user_confirmation' || emailType === 'vendor_lead')
      ? resolveEmailRecipient(emailType, normalizedTo)
      : {
          recipient: normalizedTo,
          originalRecipient: normalizedTo,
          overridden: false,
        };

  let finalText = text;
  let finalHtml = html;
  if (isLocalOrDev && emailType) {
    const withFooter = appendDevAuditFooter(
      emailType,
      route.originalRecipient,
      route.recipient,
      text,
      html
    );
    finalText = withFooter.text;
    finalHtml = withFooter.html;
  }

  if (!transporter) {
    return {
      sent: false,
      error: 'SMTP mailer not configured',
      emailType,
      originalRecipient: route.originalRecipient,
      recipient: route.recipient,
    };
  }

  if (!isEmailLike(route.recipient)) {
    return {
      sent: false,
      error: 'Recipient email is missing or invalid',
      emailType,
      originalRecipient: route.originalRecipient,
      recipient: route.recipient,
    };
  }

  if (isLocalOrDev && emailType) {
    console.log('Dev email send:', {
      emailType,
      originalTo: route.originalRecipient || '(empty)',
      finalTo: route.recipient,
      subject,
    });
  }

  try {
    await transporter.sendMail({
      to: route.recipient,
      from: `"${fromName}" <${fromEmail}>`,
      subject,
      text: finalText,
      html: finalHtml,
    });
    return {
      sent: true,
      emailType,
      originalRecipient: route.originalRecipient,
      recipient: route.recipient,
    };
  } catch (error: any) {
    if (isLocalOrDev && emailType) {
      console.error('Dev email send error:', {
        emailType,
        originalTo: route.originalRecipient || '(empty)',
        finalTo: route.recipient || '(empty)',
        subject,
        error: error?.message || 'Unknown SMTP error',
      });
    } else {
      console.error('SMTP send error:', {
        to: route.recipient,
        subject,
        error: error?.message || 'Unknown SMTP error',
      });
    }
    return {
      sent: false,
      error: error?.message || 'SMTP send failed',
      emailType,
      originalRecipient: route.originalRecipient,
      recipient: route.recipient,
    };
  }
};

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
  const subject = `Your ${companyName} verification code`;
  const expiresText = expiresAt.toISOString().replace('T', ' ').replace('Z', ' UTC');
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

  return sendEmail({ to, subject, text, html });
};

interface TestEmailInput {
  to: string;
  subject?: string;
  body?: string;
}

export const sendTestEmail = async ({
  to,
  subject,
  body,
}: TestEmailInput): Promise<{ sent: boolean; error?: string }> => {
  const finalSubject = subject || 'CorpDeals SMTP test email';
  const sentAt = new Date().toISOString();
  const defaultBody = 'This is a test email from CorpDeals.';
  const finalBody = body || defaultBody;
  const text = [
    finalBody,
    'If you received this, SMTP configuration is working.',
    `Sent at: ${sentAt}`,
  ].join('\n');
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <h2 style="margin: 0 0 12px;">SMTP Test Successful</h2>
      <p>${finalBody}</p>
      <p>If you received this, SMTP configuration is working.</p>
      <p><strong>Sent at:</strong> ${sentAt}</p>
    </div>
  `;

  return sendEmail({ to, subject: finalSubject, text, html });
};

interface LeadConfirmationEmailInput {
  to: string;
  offerTitle: string;
  companyName: string;
  vendorName: string;
  leadId: string;
}

export const sendLeadSubmissionConfirmationEmail = async ({
  to,
  offerTitle,
  companyName,
  vendorName,
  leadId,
}: LeadConfirmationEmailInput): Promise<SendEmailResult> => {
  const subject = `We received your request – ${offerTitle}`;
  const text = [
    `Thanks for your request for "${offerTitle}".`,
    `Company: ${companyName}`,
    `Vendor: ${vendorName}`,
    `Reference ID: ${leadId}`,
    'Vendor follow-up window: 2-3 business days.',
    'Support: support@effectiverenovations.com',
  ].join('\n');
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <h2 style="margin: 0 0 12px;">Request Received</h2>
      <p>Thanks for your request for <strong>${offerTitle}</strong>.</p>
      <p><strong>Company:</strong> ${companyName}</p>
      <p><strong>Vendor:</strong> ${vendorName}</p>
      <p><strong>Reference ID:</strong> ${leadId}</p>
      <p>Vendor follow-up window: <strong>2-3 business days</strong>.</p>
      <p>Support: <a href="mailto:support@effectiverenovations.com">support@effectiverenovations.com</a></p>
    </div>
  `;
  return sendEmail({
    emailType: 'user_confirmation',
    to,
    subject,
    text,
    html,
  });
};

interface VendorLeadNotificationInput {
  vendorEmail: string;
  vendorCompanyName: string;
  companyName: string;
  offerTitle: string;
  dashboardLeadUrl?: string;
  lead: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string | null;
    message?: string | null;
    createdAt: Date;
    consentAt?: Date | null;
    consentIp?: string | null;
    productName?: string | null;
    productModel?: string | null;
    productUrl?: string | null;
  };
}

export const sendVendorLeadNotificationEmail = async ({
  vendorEmail,
  vendorCompanyName,
  companyName,
  offerTitle,
  dashboardLeadUrl,
  lead,
}: VendorLeadNotificationInput): Promise<{
  sent: boolean;
  error?: string;
  recipient: string;
  actualVendorEmail: string;
  overridden: boolean;
}> => {
  if (!isLocalOrDev && (!vendorEmail || !isEmailLike(normalizeEmail(vendorEmail)))) {
    return {
      sent: false,
      error: 'Vendor email is missing or invalid',
      recipient: '',
      actualVendorEmail: normalizeEmail(vendorEmail || ''),
      overridden: false,
    };
  }

  const subject = `New Lead – ${offerTitle} (${companyName})`;
  const leadName = `${lead.firstName} ${lead.lastName}`.trim();
  const consentAtText = lead.consentAt ? lead.consentAt.toISOString() : 'N/A';
  const consentIpText = lead.consentIp || 'N/A';
  const productNameText = lead.productName || 'N/A';
  const productModelText = lead.productModel || 'N/A';
  const productUrlText = lead.productUrl || 'N/A';
  const text = [
    `Lead ID: ${lead.id}`,
    `Offer: ${offerTitle}`,
    `Company: ${companyName}`,
    `User name: ${leadName}`,
    `User email: ${lead.email}`,
    `User phone: ${lead.phone || 'N/A'}`,
    `Consent timestamp: ${consentAtText}`,
    `Consent IP: ${consentIpText}`,
    `Product name: ${productNameText}`,
    `Product model: ${productModelText}`,
    `Product URL: ${productUrlText}`,
    dashboardLeadUrl ? `Dashboard link: ${dashboardLeadUrl}` : '',
    `Vendor: ${vendorCompanyName}`,
    `Message: ${lead.message || 'N/A'}`,
    `Lead created at: ${lead.createdAt.toISOString()}`,
  ]
    .filter(Boolean)
    .join('\n');
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <h2 style="margin: 0 0 12px;">New lead received</h2>
      <p><strong>Lead ID:</strong> ${lead.id}</p>
      <p><strong>Offer:</strong> ${offerTitle}</p>
      <p><strong>Company:</strong> ${companyName}</p>
      <p><strong>User name:</strong> ${leadName}</p>
      <p><strong>User email:</strong> ${lead.email}</p>
      <p><strong>User phone:</strong> ${lead.phone || 'N/A'}</p>
      <p><strong>Consent timestamp:</strong> ${consentAtText}</p>
      <p><strong>Consent IP:</strong> ${consentIpText}</p>
      <p><strong>Product name:</strong> ${productNameText}</p>
      <p><strong>Product model:</strong> ${productModelText}</p>
      <p><strong>Product URL:</strong> ${lead.productUrl ? `<a href="${lead.productUrl}">${lead.productUrl}</a>` : 'N/A'}</p>
      ${
        dashboardLeadUrl
          ? `<p><strong>Dashboard link:</strong> <a href="${dashboardLeadUrl}">${dashboardLeadUrl}</a></p>`
          : ''
      }
      <p><strong>Vendor:</strong> ${vendorCompanyName}</p>
      <p><strong>Message:</strong> ${lead.message || 'N/A'}</p>
      <p><strong>Lead created at:</strong> ${lead.createdAt.toISOString()}</p>
    </div>
  `;

  const result = await sendEmail({
    emailType: 'vendor_lead',
    to: vendorEmail,
    subject,
    text,
    html,
  });

  return {
    sent: result.sent,
    error: result.error,
    recipient: result.recipient,
    actualVendorEmail: result.originalRecipient,
    overridden: result.recipient !== result.originalRecipient,
  };
};

interface VendorApplicationInternalEmailInput {
  businessName: string;
  contactName: string;
  contactEmail: string;
  phone?: string | null;
  website?: string | null;
  category?: string | null;
  city?: string | null;
  notes?: string | null;
}

export const sendVendorApplicationInternalEmail = async ({
  businessName,
  contactName,
  contactEmail,
  phone,
  website,
  category,
  city,
  notes,
}: VendorApplicationInternalEmailInput): Promise<SendEmailResult> => {
  const supportEmail = process.env.VENDOR_SUPPORT_EMAIL || 'support@effectiverenovations.com';
  const subject = `New Vendor Application - ${businessName}`;
  const text = [
    `Business name: ${businessName}`,
    `Contact name: ${contactName}`,
    `Contact email: ${contactEmail}`,
    `Phone: ${phone || 'N/A'}`,
    `Website: ${website || 'N/A'}`,
    `Category: ${category || 'N/A'}`,
    `City: ${city || 'N/A'}`,
    `Notes: ${notes || 'N/A'}`,
  ].join('\n');
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <h2 style="margin: 0 0 12px;">New Vendor Application</h2>
      <p><strong>Business name:</strong> ${businessName}</p>
      <p><strong>Contact name:</strong> ${contactName}</p>
      <p><strong>Contact email:</strong> ${contactEmail}</p>
      <p><strong>Phone:</strong> ${phone || 'N/A'}</p>
      <p><strong>Website:</strong> ${website || 'N/A'}</p>
      <p><strong>Category:</strong> ${category || 'N/A'}</p>
      <p><strong>City:</strong> ${city || 'N/A'}</p>
      <p><strong>Notes:</strong> ${notes || 'N/A'}</p>
    </div>
  `;
  return sendEmail({ to: supportEmail, subject, text, html });
};

interface VendorApprovalEmailInput {
  to: string;
  businessName: string;
  loginUrl: string;
  setPasswordUrl: string;
}

export const sendVendorApprovalEmail = async ({
  to,
  businessName,
  loginUrl,
  setPasswordUrl,
}: VendorApprovalEmailInput): Promise<SendEmailResult> => {
  const subject = 'Approved. Login here: /vendor/login';
  const text = [
    `Your vendor account for ${businessName} is approved.`,
    `Set your password: ${setPasswordUrl}`,
    `Vendor login: ${loginUrl}`,
  ].join('\n');
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <h2 style="margin: 0 0 12px;">Vendor Application Approved</h2>
      <p>Your vendor account for <strong>${businessName}</strong> is approved.</p>
      <p><a href="${setPasswordUrl}">Set your password</a></p>
      <p>Then log in here: <a href="${loginUrl}">${loginUrl}</a></p>
    </div>
  `;
  return sendEmail({ to, subject, text, html });
};

interface VendorRejectionEmailInput {
  to: string;
  businessName: string;
}

export const sendVendorRejectionEmail = async ({
  to,
  businessName,
}: VendorRejectionEmailInput): Promise<SendEmailResult> => {
  const subject = 'Vendor application update';
  const text = [
    `Thanks for applying with ${businessName}.`,
    'Your vendor application was not approved at this time.',
    'For questions, contact support@effectiverenovations.com',
  ].join('\n');
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <h2 style="margin: 0 0 12px;">Vendor Application Update</h2>
      <p>Thanks for applying with <strong>${businessName}</strong>.</p>
      <p>Your vendor application was not approved at this time.</p>
      <p>Questions: <a href="mailto:support@effectiverenovations.com">support@effectiverenovations.com</a></p>
    </div>
  `;
  return sendEmail({ to, subject, text, html });
};

interface OfferSubmittedForReviewEmailInput {
  offerId: string;
  vendorName: string;
  vendorCompany: string;
  targetCompanyName?: string;
  offerTitle: string;
  submittedAt: Date;
  submittedIp: string;
  termsText: string;
  cancellationPolicyText: string;
  restrictionsText?: string | null;
  redemptionInstructionsText?: string | null;
}

export const sendOfferSubmittedForReviewEmail = async ({
  offerId,
  vendorName,
  vendorCompany,
  targetCompanyName,
  offerTitle,
  submittedAt,
  submittedIp,
  termsText,
  cancellationPolicyText,
  restrictionsText,
  redemptionInstructionsText,
}: OfferSubmittedForReviewEmailInput): Promise<SendEmailResult> => {
  const supportEmail = 'support@effectiverenovations.com';
  const subject = `Offer submitted for review: ${vendorCompany} - ${offerTitle}`;
  const text = [
    `Offer ID: ${offerId}`,
    `Vendor: ${vendorName}`,
    `Vendor company: ${vendorCompany}`,
    `Target company: ${targetCompanyName || 'N/A'}`,
    `Offer title: ${offerTitle}`,
    `Submitted at: ${submittedAt.toISOString()}`,
    `Submitted IP: ${submittedIp}`,
    '',
    'Terms & Conditions:',
    termsText,
    '',
    'Cancellation/Refund Policy:',
    cancellationPolicyText,
    '',
    'Restrictions:',
    restrictionsText || 'N/A',
    '',
    'Redemption Instructions:',
    redemptionInstructionsText || 'N/A',
  ].join('\n');
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <h2 style="margin: 0 0 12px;">Offer Submitted For Review</h2>
      <p><strong>Offer ID:</strong> ${offerId}</p>
      <p><strong>Vendor:</strong> ${vendorName}</p>
      <p><strong>Vendor company:</strong> ${vendorCompany}</p>
      <p><strong>Target company:</strong> ${targetCompanyName || 'N/A'}</p>
      <p><strong>Offer title:</strong> ${offerTitle}</p>
      <p><strong>Submitted at:</strong> ${submittedAt.toISOString()}</p>
      <p><strong>Submitted IP:</strong> ${submittedIp}</p>
      <h3 style="margin: 18px 0 6px;">Terms &amp; Conditions</h3>
      <pre style="white-space: pre-wrap; font-family: inherit;">${termsText}</pre>
      <h3 style="margin: 18px 0 6px;">Cancellation/Refund Policy</h3>
      <pre style="white-space: pre-wrap; font-family: inherit;">${cancellationPolicyText}</pre>
      <h3 style="margin: 18px 0 6px;">Restrictions</h3>
      <pre style="white-space: pre-wrap; font-family: inherit;">${restrictionsText || 'N/A'}</pre>
      <h3 style="margin: 18px 0 6px;">Redemption Instructions</h3>
      <pre style="white-space: pre-wrap; font-family: inherit;">${redemptionInstructionsText || 'N/A'}</pre>
    </div>
  `;
  return sendEmail({ to: supportEmail, subject, text, html });
};

interface OfferReviewDecisionEmailInput {
  to: string;
  businessName: string;
  offerTitle: string;
  status: 'APPROVED' | 'REJECTED';
  complianceNotes?: string | null;
}

export const sendOfferReviewDecisionEmail = async ({
  to,
  businessName,
  offerTitle,
  status,
  complianceNotes,
}: OfferReviewDecisionEmailInput): Promise<SendEmailResult> => {
  const isApproved = status === 'APPROVED';
  const subject = isApproved ? 'Your offer is live' : 'Fix required';
  const text = isApproved
    ? [
        `Your offer "${offerTitle}" has been approved and is now live.`,
        `Vendor account: ${businessName}`,
      ].join('\n')
    : [
        `Your offer "${offerTitle}" was rejected during compliance review.`,
        `Vendor account: ${businessName}`,
        `Required fixes: ${complianceNotes || 'Please review and resubmit.'}`,
      ].join('\n');
  const html = isApproved
    ? `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2 style="margin: 0 0 12px;">Your offer is live</h2>
        <p>Your offer <strong>${offerTitle}</strong> has been approved and is now live.</p>
        <p><strong>Vendor account:</strong> ${businessName}</p>
      </div>
    `
    : `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2 style="margin: 0 0 12px;">Fix required</h2>
        <p>Your offer <strong>${offerTitle}</strong> was rejected during compliance review.</p>
        <p><strong>Vendor account:</strong> ${businessName}</p>
        <p><strong>Required fixes:</strong> ${complianceNotes || 'Please review and resubmit.'}</p>
      </div>
    `;
  return sendEmail({ to, subject, text, html });
};

interface QaTestEmailInput {
  emailType: RoutedEmailType;
  to: string;
  subject: string;
  body: string;
}

export const sendQaTypedTestEmail = async ({
  emailType,
  to,
  subject,
  body,
}: QaTestEmailInput): Promise<SendEmailResult> => {
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <p>${body}</p>
    </div>
  `;
  return sendEmail({
    emailType,
    to,
    subject,
    text: body,
    html,
  });
};
