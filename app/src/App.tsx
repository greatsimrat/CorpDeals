import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { LeadProvider } from './context/LeadContext';
import { OffersProvider } from './context/OffersContext';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import './App.css';

// Pages
import HomePage from './pages/HomePage';
import CompanyPage from './pages/CompanyPage';
import CategoryPage from './pages/CategoryPage';
import OfferPage from './pages/OfferPage';
import VendorPortal from './pages/VendorPortal';
import NotFoundPage from './pages/NotFoundPage';

// Auth Pages
import LoginPage from './pages/auth/LoginPage';
import BecomePartnerPage from './pages/BecomePartnerPage';

// Admin Pages
import AdminLayout from './pages/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import VendorRequestsPage from './pages/admin/VendorRequestsPage';
import VendorsPage from './pages/admin/VendorsPage';
import CompaniesPage from './pages/admin/CompaniesPage';
import UsersPage from './pages/admin/UsersPage';
import AdminOffersPage from './pages/AdminOffersPage';
import AdminLeadsPage from './pages/admin/AdminLeadsPage';

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
                <Route path="/company/:companyId" element={<CompanyPage />} />
                <Route path="/company/:companyId/category/:categoryId" element={<CategoryPage />} />
                <Route path="/offer/:offerId" element={<OfferPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/become-partner" element={<BecomePartnerPage />} />

                {/* Vendor Routes */}
                <Route path="/vendor-portal" element={
                  <ProtectedRoute requireVendor>
                    <VendorPortal />
                  </ProtectedRoute>
                } />

                {/* Admin Routes */}
                <Route path="/admin" element={
                  <ProtectedRoute requireAdmin>
                    <AdminLayout />
                  </ProtectedRoute>
                }>
                  <Route index element={<AdminDashboard />} />
                  <Route path="vendor-requests" element={<VendorRequestsPage />} />
                  <Route path="vendors" element={<VendorsPage />} />
                  <Route path="companies" element={<CompaniesPage />} />
                  <Route path="offers" element={<AdminOffersPage />} />
                  <Route path="leads" element={<AdminLeadsPage />} />
                  <Route path="categories" element={<AdminOffersPage />} />
                  <Route path="users" element={<UsersPage />} />
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
