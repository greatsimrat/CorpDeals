import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';

// Load base env first, then let .env.local override for local development.
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local'), override: true });

// Import routes
import authRoutes from './routes/auth';
import vendorRoutes from './routes/vendors';
import vendorJourneyRoutes from './routes/vendor';
import companyRoutes from './routes/companies';
import categoryRoutes from './routes/categories';
import offerRoutes from './routes/offers';
import hrContactRoutes from './routes/hr-contacts';
import adminRoutes from './routes/admin';
import leadRoutes from './routes/leads';
import employeeVerificationRoutes from './routes/employee-verifications';
import financeRoutes from './routes/finance';
import { sendTestEmail } from './lib/mailer';
import devRoutes from './routes/dev';
import myApplicationsRoutes from './routes/my-applications';
import qaRoutes from './routes/qa';
import { authenticateTokenOptional } from './middleware/auth';
import { buildAuthUserPayload } from './lib/auth-user';
import { listUserVerifications, VERIFIED_STATUS } from './lib/verifications';

const app = express();
const PORT = process.env.PORT || 3001;
const isDevelopment = process.env.NODE_ENV !== 'production';
app.set('trust proxy', true);

// Middleware
const explicitOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:5173',
].filter(Boolean) as string[];

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
    if (explicitOrigins.includes(origin)) {
      callback(null, true);
      return;
    }
    if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
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
app.use('/api/auth', authRoutes);
app.use('/api/vendors', vendorRoutes);
app.use('/api/vendor', vendorJourneyRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/offers', offerRoutes);
app.use('/api/hr-contacts', hrContactRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/employee-verifications', employeeVerificationRoutes);
app.use('/api/verify', employeeVerificationRoutes);
app.use('/api/my-applications', myApplicationsRoutes);
if (isDevelopment) {
  app.use('/dev', devRoutes);
  app.use('/qa', qaRoutes);
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

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

export default app;
