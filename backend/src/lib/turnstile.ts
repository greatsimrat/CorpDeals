const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export const isTurnstileConfigured = () => Boolean(process.env.TURNSTILE_SECRET_KEY?.trim());

export const verifyTurnstileToken = async (token: string, remoteIp?: string | null) => {
  const secret = process.env.TURNSTILE_SECRET_KEY?.trim();
  if (!secret) {
    return { configured: false, success: true as const };
  }

  if (!token.trim()) {
    return { configured: true, success: false as const, errorCodes: ['missing-input-response'] };
  }

  const body = new URLSearchParams({
    secret,
    response: token.trim(),
  });

  if (remoteIp?.trim()) {
    body.set('remoteip', remoteIp.trim());
  }

  const response = await fetch(TURNSTILE_VERIFY_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });

  if (!response.ok) {
    return { configured: true, success: false as const, errorCodes: ['verification-request-failed'] };
  }

  const result = (await response.json()) as {
    success?: boolean;
    'error-codes'?: string[];
  };

  return {
    configured: true,
    success: Boolean(result.success),
    errorCodes: result['error-codes'] || [],
  };
};
