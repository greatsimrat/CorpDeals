import express from 'express';
import cors from 'cors';
import { loadRuntimeEnv } from './lib/runtime-env';

loadRuntimeEnv();

// In CommonJS builds, `import` declarations are evaluated before dotenv setup.
// Load env files first, then require modules that read process.env at import time.
const authRoutes = require('./routes/auth').default;
const vendorRoutes = require('./routes/vendors').default;
const vendorJourneyRoutes = require('./routes/vendor').default;
const companyRoutes = require('./routes/companies').default;
const contactRoutes = require('./routes/contact').default;
const categoryRoutes = require('./routes/categories').default;
const offerRoutes = require('./routes/offers').default;
const hrContactRoutes = require('./routes/hr-contacts').default;
const adminRoutes = require('./routes/admin').default;
const leadRoutes = require('./routes/leads').default;
const employeeVerificationRoutes = require('./routes/employee-verifications').default;
const financeRoutes = require('./routes/finance').default;
const salesRoutes = require('./routes/sales').default;
const { handleStripeWebhook } = require('./routes/payments');
const { sendTestEmail } = require('./lib/mailer');
const devRoutes = require('./routes/dev').default;
const myApplicationsRoutes = require('./routes/my-applications').default;
const qaRoutes = require('./routes/qa').default;
const { authenticateTokenOptional } = require('./middleware/auth');
const { buildAuthUserPayload } = require('./lib/auth-user');
const { listUserVerifications, VERIFIED_STATUS } = require('./lib/verifications');
const { mountRouter, printRoutesTable } = require('./lib/route-inspector');

const app = express();
const PORT = process.env.PORT || 3001;
const isDevelopment = process.env.NODE_ENV !== 'production';
const shouldPrintRoutes =
  process.env.PRINT_ROUTES === 'true' ||
  (isDevelopment && process.env.PRINT_ROUTES !== 'false');
app.set('trust proxy', true);

// Middleware
const normalizeOrigin = (value: string) => value.trim().replace(/\/$/, '');
const parseConfiguredOrigins = (...values: Array<string | undefined>) =>
  Array.from(
    new Set(
      values
        .flatMap((value) => String(value || '').split(','))
        .map((value) => value.trim())
        .filter(Boolean)
        .map(normalizeOrigin)
    )
  );

const explicitOrigins = parseConfiguredOrigins(
  process.env.FRONTEND_URL,
  process.env.FRONTEND_URLS,
  'http://localhost:5173'
);

app.use(cors({
  origin: (origin, callback) => {
    if (isDevelopment) {
      callback(null, true);
      return;
    }
    if (!origin) {
      callback(null, true);
      return;
    }
    const normalizedOrigin = normalizeOrigin(origin);
    if (explicitOrigins.includes(normalizedOrigin)) {
      callback(null, true);
      return;
    }
    if (
      normalizedOrigin.startsWith('http://localhost:') ||
      normalizedOrigin.startsWith('http://127.0.0.1:')
    ) {
      callback(null, true);
      return;
    }
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

// Stripe webhook must read raw body for signature verification.
app.post(
  '/api/payments/stripe/webhook',
  express.raw({ type: 'application/json' }),
  (req, res) => {
    handleStripeWebhook(req, res);
  }
);

app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/me', authenticateTokenOptional, async (req, res) => {
  try {
    if (!req.user?.id) {
      res.json({
        logged_in: false,
        loggedIn: false,
        user: null,
        verified_companies: [],
        verifiedCompanies: [],
        active_company_id: null,
        activeCompanyId: null,
      });
      return;
    }

    const [user, records] = await Promise.all([
      buildAuthUserPayload(req.user.id),
      listUserVerifications(req.user.id),
    ]);

    if (!user) {
      res.json({
        logged_in: false,
        loggedIn: false,
        user: null,
        verified_companies: [],
        verifiedCompanies: [],
        active_company_id: null,
        activeCompanyId: null,
      });
      return;
    }

    const now = new Date();
    const verifiedCompanies = records
      .filter((record: any) => record.status === VERIFIED_STATUS && record.expiresAt > now)
      .map((record: any) => ({
        id: record.company.id,
        slug: record.company.slug,
        name: record.company.name,
        domain: record.company.domain,
        verifiedAt: record.verifiedAt,
        expiresAt: record.expiresAt,
      }));

    res.json({
      logged_in: true,
      loggedIn: true,
      user,
      verified_companies: verifiedCompanies,
      verifiedCompanies,
      active_company_id: user.activeCompany?.id || user.employeeCompany?.id || null,
      activeCompanyId: user.activeCompany?.id || user.employeeCompany?.id || null,
    });
  } catch (error) {
    console.error('Get /api/me error:', error);
    res.status(500).json({ error: 'Failed to fetch session status' });
  }
});

// Public SMTP test endpoint (development only)
if (isDevelopment) {
  app.get('/test-email', async (req, res) => {
    const recipient =
      process.env.VENDOR_NOTIFICATION_TEST_EMAIL ||
      process.env.SUPPORT_EMAIL ||
      process.env.MAIL_FROM_ADDRESS ||
      'support@corpdeals.ca';
    const subject = 'SMTP Test Successful';
    const body =
      'If you received this email, Hostinger SMTP is configured correctly.';

    try {
      const result = await sendTestEmail({
        to: recipient,
        subject,
        body,
      });

      if (!result.sent) {
        const isNotConfigured = (result.error || '').includes('not configured');
        if (!isNotConfigured) {
          console.error('GET /test-email send error:', result.error);
        }
        res.status(isNotConfigured ? 503 : 500).json({
          status: isNotConfigured ? 'Email not configured' : 'Email failed',
          error: result.error || 'Unknown mailer error',
        });
        return;
      }

      res.json({ status: 'Email sent' });
    } catch (error: any) {
      console.error('GET /test-email error:', error);
      res.status(500).json({
        status: 'Email failed',
        error: error?.message || 'Unknown error',
      });
    }
  });
}

// Routes
mountRouter(app, '/api/auth', authRoutes);
mountRouter(app, '/api/vendors', vendorRoutes);
mountRouter(app, '/api/vendor', vendorJourneyRoutes);
mountRouter(app, '/api/companies', companyRoutes);
mountRouter(app, '/api/contact', contactRoutes);
mountRouter(app, '/api/categories', categoryRoutes);
mountRouter(app, '/api/offers', offerRoutes);
mountRouter(app, '/api/hr-contacts', hrContactRoutes);
mountRouter(app, '/api/admin', adminRoutes);
mountRouter(app, '/api/finance', financeRoutes);
mountRouter(app, '/api/sales', salesRoutes);
mountRouter(app, '/api/leads', leadRoutes);
mountRouter(app, '/api/employee-verifications', employeeVerificationRoutes);
mountRouter(app, '/api/verify', employeeVerificationRoutes);
mountRouter(app, '/api/my-applications', myApplicationsRoutes);
if (isDevelopment) {
  mountRouter(app, '/dev', devRoutes);
  mountRouter(app, '/qa', qaRoutes);
}

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

if (shouldPrintRoutes) {
  printRoutesTable(app);
}

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

export default app;
