import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { LeadProvider } from './context/LeadContext';
import { OffersProvider } from './context/OffersContext';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import CompanyRouteGuard from './components/CompanyRouteGuard';
import './App.css';

// Pages
import HomePage from './pages/HomePage';
import CompanyPage from './pages/CompanyPage';
import CompanyDealsPage from './pages/CompanyDealsPage';
import CategoryPage from './pages/CategoryPage';
import ConfirmationPage from './pages/ConfirmationPage';
import MyApplicationsPage from './pages/MyApplicationsPage';
import NotFoundPage from './pages/NotFoundPage';
import VerifyEmployeePage from './pages/VerifyEmployeePage';
import VendorApplyPage from './pages/vendor/VendorApplyPage';
import VendorLoginPage from './pages/vendor/VendorLoginPage';
import VendorSetPasswordPage from './pages/vendor/VendorSetPasswordPage';
import VendorLayout from './pages/vendor/VendorLayout';
import VendorDashboardPage from './pages/vendor/VendorDashboardPage';
import VendorOffersPage from './pages/vendor/VendorOffersPage';
import VendorOfferFormPage from './pages/vendor/VendorOfferFormPage';
import VendorLeadsPage from './pages/vendor/VendorLeadsPage';
import VendorLeadDetailPage from './pages/vendor/VendorLeadDetailPage';
import VendorBillingPage from './pages/vendor/VendorBillingPage';
import VendorProfilePage from './pages/vendor/VendorProfilePage';
import VendorTermsPage from './pages/vendor/VendorTermsPage';
import OfferPage from './pages/OfferPage';
import OfferClaimPage from './pages/OfferClaimPage';

// Auth Pages
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';

// Admin Pages
import AdminLayout from './pages/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import VendorRequestsPage from './pages/admin/VendorRequestsPage';
import VendorsPage from './pages/admin/VendorsPage';
import CompaniesPage from './pages/admin/CompaniesPage';
import UsersPage from './pages/admin/UsersPage';
import AdminOffersPage from './pages/AdminOffersPage';
import AdminLeadsPage from './pages/admin/AdminLeadsPage';
import OffersReviewPage from './pages/admin/OffersReviewPage';
import AdminVendorBillingPlanPage from './pages/admin/AdminVendorBillingPlanPage';
import AdminInvoicesPage from './pages/admin/AdminInvoicesPage';
import AdminInvoiceDetailPage from './pages/admin/AdminInvoiceDetailPage';
import AdminPlansPage from './pages/admin/AdminPlansPage';
import AdminPricingPage from './pages/admin/AdminPricingPage';
import AdminBillingPreviewPage from './pages/admin/AdminBillingPreviewPage';
import AdminCategoriesPage from './pages/admin/AdminCategoriesPage';
import FinanceLayout from './pages/finance/FinanceLayout';
import FinanceDashboard from './pages/finance/FinanceDashboard';
import SalesLayout from './pages/sales/SalesLayout';
import SalesDashboardPage from './pages/sales/SalesDashboardPage';
import SeoContentPage from './pages/SeoContentPage';
import PolicyTypesPage from './pages/PolicyTypesPage';
import PricingPage from './pages/PricingPage';
import LegalPage from './pages/LegalPage';
import ContactPage from './pages/ContactPage';

function LegacyCompanyRedirect() {
  const { companyId } = useParams<{ companyId: string }>();
  return <Navigate to={`/c/${companyId}`} replace />;
}

function LegacyCompanyDealsRedirect() {
  const { companyId } = useParams<{ companyId: string }>();
  return <Navigate to={`/c/${companyId}`} replace />;
}

function App() {
  return (
    <AuthProvider>
      <OffersProvider>
        <LeadProvider>
          <BrowserRouter>
            <div className="relative">
              {/* Noise overlay for texture */}
              <div className="noise-overlay" />
              
              {/* Routes */}
              <Routes>
                {/* Public Routes */}
                <Route path="/" element={<HomePage />} />
                <Route path="/company/:companyId" element={<LegacyCompanyRedirect />} />
                <Route path="/company/:companyId/deals" element={<LegacyCompanyDealsRedirect />} />
                <Route path="/company/:companyId/overview" element={<CompanyPage />} />
                <Route
                  path="/c/:companySlug"
                  element={
                    <CompanyRouteGuard>
                      <CompanyDealsPage />
                    </CompanyRouteGuard>
                  }
                />
                <Route path="/company/:companyId/category/:categoryId" element={<CategoryPage />} />
                <Route path="/offer/:offerSlug" element={<OfferPage />} />
                <Route path="/offers/:offerSlug" element={<OfferPage />} />
                <Route path="/offers/:offerSlug/claim" element={<OfferClaimPage />} />
                <Route
                  path="/confirmation"
                  element={
                    <ProtectedRoute allowedRoles={['USER']}>
                      <ConfirmationPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/my-applications"
                  element={
                    <ProtectedRoute allowedRoles={['USER']}>
                      <MyApplicationsPage />
                    </ProtectedRoute>
                  }
                />
                <Route path="/verify" element={<VerifyEmployeePage />} />
                <Route path="/verify/:companyId" element={<VerifyEmployeePage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/signup" element={<RegisterPage />} />
                <Route path="/become-partner" element={<Navigate to="/vendor/apply" replace />} />
                <Route path="/vendor/apply" element={<VendorApplyPage />} />
                <Route path="/vendor/login" element={<VendorLoginPage />} />
                <Route path="/vendor/set-password" element={<VendorSetPasswordPage />} />
                <Route path="/vendor/terms" element={<VendorTermsPage />} />
                <Route path="/for-employees" element={<SeoContentPage pageKey="forEmployees" />} />
                <Route path="/for-vendors" element={<SeoContentPage pageKey="forVendors" />} />
                <Route path="/for-hr-teams" element={<SeoContentPage pageKey="forHrTeams" />} />
                <Route path="/pricing" element={<PricingPage />} />
                <Route path="/about" element={<SeoContentPage pageKey="about" />} />
                <Route path="/contact" element={<ContactPage />} />
                <Route path="/careers" element={<SeoContentPage pageKey="careers" />} />
                <Route path="/press" element={<SeoContentPage pageKey="press" />} />
                <Route path="/blog" element={<SeoContentPage pageKey="blog" />} />
                <Route path="/help-center" element={<SeoContentPage pageKey="helpCenter" />} />
                <Route path="/api-docs" element={<SeoContentPage pageKey="apiDocs" />} />
                <Route path="/partner-portal" element={<SeoContentPage pageKey="partnerPortal" />} />
                <Route path="/case-studies" element={<SeoContentPage pageKey="caseStudies" />} />
                <Route path="/privacy-policy" element={<LegalPage pageKey="privacy" />} />
                <Route path="/terms-of-service" element={<LegalPage pageKey="terms" />} />
                <Route path="/cookie-policy" element={<LegalPage pageKey="cookies" />} />
                <Route path="/security" element={<SeoContentPage pageKey="security" />} />
                <Route path="/policies" element={<PolicyTypesPage />} />
                <Route path="/privacy" element={<Navigate to="/privacy-policy" replace />} />
                <Route path="/terms" element={<Navigate to="/terms-of-service" replace />} />
                <Route path="/cookies" element={<Navigate to="/cookie-policy" replace />} />

                {/* Vendor Routes */}
                <Route path="/vendor-portal" element={
                  <Navigate to="/vendor/dashboard" replace />
                } />
                <Route
                  path="/vendor"
                  element={
                    <ProtectedRoute allowedRoles={['VENDOR']}>
                      <VendorLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<Navigate to="/vendor/dashboard" replace />} />
                  <Route path="dashboard" element={<VendorDashboardPage />} />
                  <Route path="profile" element={<VendorProfilePage />} />
                  <Route path="offers" element={<VendorOffersPage />} />
                  <Route path="offers/new" element={<VendorOfferFormPage />} />
                  <Route path="offers/:offerId/edit" element={<VendorOfferFormPage />} />
                  <Route path="leads" element={<VendorLeadsPage />} />
                  <Route path="leads/:leadId" element={<VendorLeadDetailPage />} />
                  <Route path="billing" element={<VendorBillingPage />} />
                </Route>

                {/* Admin Routes */}
                <Route path="/admin" element={
                  <ProtectedRoute allowedRoles={['ADMIN']}>
                    <AdminLayout />
                  </ProtectedRoute>
                }>
                  <Route index element={<AdminDashboard />} />
                  <Route path="vendor-requests" element={<VendorRequestsPage />} />
                  <Route path="vendors" element={<VendorsPage />} />
                  <Route path="vendors/:vendorId/billing-plan" element={<AdminVendorBillingPlanPage />} />
                  <Route path="companies" element={<CompaniesPage />} />
                  <Route path="offers" element={<AdminOffersPage />} />
                  <Route path="offers-review" element={<OffersReviewPage />} />
                  <Route path="leads" element={<AdminLeadsPage />} />
                  <Route path="plans" element={<AdminPlansPage />} />
                  <Route path="pricing" element={<AdminPricingPage />} />
                  <Route path="billing-preview" element={<AdminBillingPreviewPage />} />
                  <Route path="invoices" element={<AdminInvoicesPage />} />
                  <Route path="invoices/:invoiceId" element={<AdminInvoiceDetailPage />} />
                  <Route path="categories" element={<AdminCategoriesPage />} />
                  <Route path="users" element={<UsersPage />} />
                </Route>

                {/* Finance Routes */}
                <Route path="/finance" element={
                  <ProtectedRoute allowedRoles={['ADMIN', 'FINANCE']}>
                    <FinanceLayout />
                  </ProtectedRoute>
                }>
                  <Route index element={<FinanceDashboard />} />
                </Route>

                <Route
                  path="/sales"
                  element={
                    <ProtectedRoute allowedRoles={['ADMIN', 'SALES']}>
                      <SalesLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<SalesDashboardPage />} />
                </Route>

                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </div>
          </BrowserRouter>
        </LeadProvider>
      </OffersProvider>
    </AuthProvider>
  );
}

export default App;

