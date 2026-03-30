import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

const envFilePath = (filename: string) => path.resolve(process.cwd(), filename);
const loadEnvFile = (filename: string, override = false) => {
  const filePath = envFilePath(filename);
  if (fs.existsSync(filePath)) {
    dotenv.config({ path: filePath, override });
  }
};

// Load shared defaults first.
loadEnvFile('.env');

// Keep .env.local for local development only. In production, prefer .env.prod.
const requestedAppEnv = (process.env.APP_ENV || process.env.NODE_ENV || '').trim().toLowerCase();
const hasProdOverride = fs.existsSync(envFilePath('.env.prod')) || fs.existsSync(envFilePath('.env.production'));
const shouldUseProductionEnv =
  requestedAppEnv === 'production' ||
  requestedAppEnv === 'prod' ||
  (!requestedAppEnv && hasProdOverride);

if (shouldUseProductionEnv) {
  loadEnvFile('.env.production', true);
  loadEnvFile('.env.prod', true);
} else {
  loadEnvFile('.env.local', true);
}

// Import routes
import authRoutes from './routes/auth';
import vendorRoutes from './routes/vendors';
import vendorJourneyRoutes from './routes/vendor';
import companyRoutes from './routes/companies';
import contactRoutes from './routes/contact';
import categoryRoutes from './routes/categories';
import offerRoutes from './routes/offers';
import hrContactRoutes from './routes/hr-contacts';
import adminRoutes from './routes/admin';
import leadRoutes from './routes/leads';
import employeeVerificationRoutes from './routes/employee-verifications';
import financeRoutes from './routes/finance';
import salesRoutes from './routes/sales';
import { sendTestEmail } from './lib/mailer';
import devRoutes from './routes/dev';
import myApplicationsRoutes from './routes/my-applications';
import qaRoutes from './routes/qa';
import { authenticateTokenOptional } from './middleware/auth';
import { buildAuthUserPayload } from './lib/auth-user';
import { listUserVerifications, VERIFIED_STATUS } from './lib/verifications';
import { mountRouter, printRoutesTable } from './lib/route-inspector';

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
      .filter((record) => record.status === VERIFIED_STATUS && record.expiresAt > now)
      .map((record) => ({
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
    const recipient = 'vendor-test@effectiverenovations.com';
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
        console.error('GET /test-email send error:', result.error);
        res.status(500).json({
          status: 'Email failed',
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
