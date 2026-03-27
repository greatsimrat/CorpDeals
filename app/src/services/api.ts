const rawApiBaseUrl = import.meta.env.VITE_API_URL?.trim() || 'http://localhost:3001';
const API_BASE_URL = rawApiBaseUrl.replace(/\/$/, '').endsWith('/api')
  ? rawApiBaseUrl.replace(/\/$/, '')
  : `${rawApiBaseUrl.replace(/\/$/, '')}/api`;

interface RequestOptions {
  method?: string;
  body?: any;
  headers?: Record<string, string>;
}

class ApiService {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem('token');
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
  }

  getToken() {
    return this.token;
  }

  private buildQuery(params?: Record<string, unknown>) {
    if (!params) return '';
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === null) return;
      const normalized = String(value).trim();
      if (!normalized || normalized === 'undefined' || normalized === 'null') return;
      searchParams.set(key, normalized);
    });
    const query = searchParams.toString();
    return query ? `?${query}` : '';
  }

  private async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { method = 'GET', body, headers = {} } = options;

    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...headers,
    };

    if (this.token) {
      requestHeaders['Authorization'] = `Bearer ${this.token}`;
    }

    let response: Response;
    try {
      response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method,
        headers: requestHeaders,
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch (networkError: any) {
      const err: any = new Error(
        `Unable to connect to backend API at ${API_BASE_URL}. Please start/restart the backend server.`
      );
      err.code = 'NETWORK_ERROR';
      err.endpoint = endpoint;
      err.cause = networkError;
      throw err;
    }

    if (!response.ok) {
      const rawBody = await response.text();
      let error: any = { error: 'Request failed' };
      if (rawBody) {
        try {
          error = JSON.parse(rawBody);
        } catch {
          error = { error: rawBody };
        }
      }

      const err: any = new Error(error.error || 'Request failed');
      err.status = response.status;
      err.responseBody = error;
      err.endpoint = endpoint;
      if (error.code) err.code = error.code;
      if (!err.code && typeof error.error === 'string') err.code = error.error;
      if (error.company) err.company = error.company;
      if (error.company_id) err.companyId = error.company_id;
      if (error.verification) err.verification = error.verification;
      throw err;
    }

    return response.json();
  }

  // Auth
  async login(email: string, password: string) {
    const result = await this.request<{ user: any; token: string }>('/auth/login', {
      method: 'POST',
      body: { email, password },
    });
    this.setToken(result.token);
    return result;
  }

  async register(data: { email: string; password: string; name?: string }) {
    const result = await this.request<{ user: any; token: string }>('/auth/register', {
      method: 'POST',
      body: data,
    });
    this.setToken(result.token);
    return result;
  }

  async getCurrentUser() {
    return this.request<any>('/auth/me');
  }

  async getMe() {
    return this.request<{
      logged_in?: boolean;
      loggedIn?: boolean;
      user: any | null;
      verified_companies?: any[];
      verifiedCompanies?: any[];
      active_company_id?: string | null;
      activeCompanyId?: string | null;
    }>('/me');
  }

  logout() {
    this.setToken(null);
  }

  // Employee Verification
  async startVerification(data: { companyId: string; workEmail: string }) {
    return this.request<{
      verificationId: string;
      expiresAt: string;
      devCode?: string;
      delivery: string;
      company: { id: string; slug: string; name: string; domain?: string | null };
    }>('/verify/start', {
      method: 'POST',
      body: data,
    });
  }

  async confirmVerification(data: {
    companyId: string;
    workEmail: string;
    otp: string;
    name?: string;
    verificationId?: string;
  }) {
    const result = await this.request<{ user: any; token: string }>('/verify/confirm', {
      method: 'POST',
      body: data,
    });
    this.setToken(result.token);
    return result;
  }

  async startEmployeeVerification(data: { companyIdOrSlug: string; email: string }) {
    return this.request<{
      verificationId: string;
      expiresAt: string;
      devCode?: string;
      delivery: string;
      company: { id: string; slug: string; name: string; domain?: string | null };
    }>('/employee-verifications/start', {
      method: 'POST',
      body: data,
    });
  }

  async verifyEmployeeCode(data: { verificationId: string; code: string; name?: string }) {
    const result = await this.request<{ user: any; token: string }>('/employee-verifications/verify', {
      method: 'POST',
      body: data,
    });
    this.setToken(result.token);
    return result;
  }

  async getEmployeeVerificationStatus() {
    return this.request<any>('/employee-verifications/status');
  }

  async getVerificationForCompany(companyIdOrSlug: string) {
    return this.request<any>(
      `/employee-verifications/company/${encodeURIComponent(companyIdOrSlug)}/status`
    );
  }

  async getMyVerifications() {
    return this.request<any[]>('/employee-verifications/my');
  }

  // Vendor Applications
  async submitVendorApplication(data: {
    businessName?: string;
    companyName?: string;
    contactName: string;
    contactEmail?: string;
    businessEmail?: string;
    email?: string;
    phone?: string;
    website?: string;
    category?: string;
    businessType?: string;
    city?: string;
    jobTitle?: string;
    targetCompanies?: string;
    offerSummary?: string;
    notes?: string;
    description?: string;
    additionalInfo?: string;
    password?: string;
    confirmPassword?: string;
  }) {
    const payload = {
      businessName: data.businessName || data.companyName || '',
      contactName: data.contactName,
      contactEmail: data.contactEmail || data.email || '',
      businessEmail: data.businessEmail || '',
      phone: data.phone,
      website: data.website,
      category: data.category || data.businessType,
      city: data.city,
      jobTitle: data.jobTitle,
      targetCompanies: data.targetCompanies,
      offerSummary: data.offerSummary,
      notes: data.notes || data.description || data.additionalInfo,
    };
    return this.request<{ ok: boolean; message: string; vendorId: string; requestId?: string }>('/vendor/apply', {
      method: 'POST',
      body: payload,
    });
  }

  async vendorLogin(email: string, password: string) {
    const result = await this.request<{ user: any; token: string }>('/vendor/login', {
      method: 'POST',
      body: { email, password },
    });
    this.setToken(result.token);
    return result;
  }

  async setVendorPassword(token: string, password: string) {
    return this.request<{ ok: boolean }>('/vendor/set-password', {
      method: 'POST',
      body: { token, password },
    });
  }

  // Vendors
  async getVendors(params?: { status?: string; search?: string }) {
    const query = params ? '?' + new URLSearchParams(params as any).toString() : '';
    return this.request<any[]>(`/vendors${query}`);
  }

  async getVendor(id: string) {
    return this.request<any>(`/vendors/${id}`);
  }

  async getVendorProfile() {
    return this.request<any>('/vendors/me/profile');
  }

  async getVendorDashboard() {
    return this.request<any>('/vendor/dashboard');
  }

  async getVendorDashboardSummary() {
    return this.request<{
      leads_today: number;
      leads_month: number;
      active_offers: number;
      qualified_leads: number;
      leads_sent: number;
    }>('/vendor/dashboard/summary');
  }

  async getVendorDashboardCompanyBreakdown() {
    return this.request<
      Array<{
        company_id: string;
        company_name: string;
        leads_30_days: number;
        total_leads: number;
        qualified_leads: number;
      }>
    >('/vendor/dashboard/company-breakdown');
  }

  async getVendorDashboardOfferPerformance() {
    return this.request<
      Array<{
        offer_id: string;
        offer_title: string;
        company_id: string;
        company_name: string;
        leads_30_days: number;
        total_leads: number;
        status: 'Active' | 'Inactive';
      }>
    >('/vendor/dashboard/offer-performance');
  }

  async getVendorDashboardLeadTrend(days = 14) {
    const query = new URLSearchParams({ days: String(days) }).toString();
    return this.request<{
      days: number;
      series: Array<{ date: string; leads: number }>;
    }>(`/vendor/dashboard/lead-trend?${query}`);
  }

  async getVendorOffers() {
    return this.request<any[]>('/vendor/offers');
  }

  async getVendorBilling() {
    return this.request<{
      vendor: { id: string; companyName: string; email: string };
      activePlan: any | null;
      invoices: any[];
    }>('/vendor/billing');
  }

  async exportVendorInvoiceCsv(invoiceId: string) {
    const headers: Record<string, string> = {};
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    const response = await fetch(
      `${API_BASE_URL}/vendor/billing/invoices/${encodeURIComponent(invoiceId)}/csv`,
      {
        method: 'GET',
        headers,
      }
    );
    if (!response.ok) {
      throw new Error('Failed to export invoice CSV');
    }
    return response.text();
  }

  async getVendorPolicyDefaults() {
    return this.request<{
      termsTemplate: { title: string; bodyText: string };
      cancellationTemplate: { title: string; bodyText: string };
    }>('/vendor/policies/defaults');
  }

  async createVendorOffer(data: any) {
    return this.request<any>('/vendor/offers', {
      method: 'POST',
      body: data,
    });
  }

  async updateVendorOffer(id: string, data: any) {
    return this.request<any>(`/vendor/offers/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: data,
    });
  }

  async submitVendorOfferForReview(id: string, data: any) {
    return this.request<any>(`/vendor/offers/${encodeURIComponent(id)}/submit`, {
      method: 'POST',
      body: data,
    });
  }

  async updateVendor(id: string, data: any) {
    return this.request<any>(`/vendors/${id}`, {
      method: 'PATCH',
      body: data,
    });
  }

  // Companies
  async getCompanies(params?: { q?: string; query?: string; search?: string; verified?: string }) {
    const searchParams = new URLSearchParams();
    const q = params?.q || params?.query || params?.search;
    if (q) searchParams.set('q', q);
    if (params?.verified) searchParams.set('verified', params.verified);

    const query = searchParams.toString();
    const data = await this.request<any>(`/companies${query ? `?${query}` : ''}`);
    const companies = Array.isArray(data) ? data : data?.companies || [];
    return companies.map((company: any) => ({
      ...company,
      domain: company.domain ?? company.domains?.[0] ?? null,
      domains: Array.isArray(company.domains)
        ? company.domains
        : company.domain
        ? [company.domain]
        : [],
    }));
  }

  async resolveCompanyFromSearch(query: string) {
    const params = new URLSearchParams({ q: query });
    return this.request<{ query: string; company: any | null; matches: any[] }>(
      `/companies/resolve/search?${params.toString()}`
    );
  }

  async getCompany(idOrSlug: string) {
    return this.request<any>(`/companies/${encodeURIComponent(idOrSlug)}`);
  }

  async getCompanyDeals(idOrSlug: string) {
    return this.request<any>(`/companies/${encodeURIComponent(idOrSlug)}/deals`);
  }

  async createCompany(data: any) {
    return this.request<any>('/companies', {
      method: 'POST',
      body: data,
    });
  }

  async updateCompany(id: string, data: any) {
    return this.request<any>(`/companies/${id}`, {
      method: 'PATCH',
      body: data,
    });
  }

  async deleteCompany(id: string) {
    return this.request<any>(`/companies/${id}`, {
      method: 'DELETE',
    });
  }

  // Categories
  async getCategories() {
    return this.request<any[]>('/categories');
  }

  async getCategory(idOrSlug: string) {
    return this.request<any>(`/categories/${idOrSlug}`);
  }

  async createCategory(data: any) {
    return this.request<any>('/categories', {
      method: 'POST',
      body: data,
    });
  }

  async updateCategory(id: string, data: any) {
    return this.request<any>(`/categories/${id}`, {
      method: 'PATCH',
      body: data,
    });
  }

  async deleteCategory(id: string) {
    return this.request<any>(`/categories/${id}`, {
      method: 'DELETE',
    });
  }

  // Offers
  async getOffers(params?: { companyId?: string; categoryId?: string; vendorId?: string; featured?: string; active?: string; search?: string }) {
    const query = params ? '?' + new URLSearchParams(params as any).toString() : '';
    return this.request<any[]>(`/offers${query}`);
  }

  async getOffer(id: string) {
    return this.request<any>(`/offers/${encodeURIComponent(id)}`);
  }

  async getOfferAccess(id: string) {
    return this.request<any>(`/offers/${encodeURIComponent(id)}/access`);
  }

  async getOfferClaimStatus(id: string) {
    return this.request<any>(`/offers/${encodeURIComponent(id)}/claim-status`);
  }

  async claimOffer(id: string) {
    return this.request<any>(`/offers/${encodeURIComponent(id)}/claim`, {
      method: 'POST',
    });
  }

  async performOfferAction(
    id: string,
    payload?: Record<string, any>
  ): Promise<{ ok: true; lead_id: string; message: string }> {
    return this.request(`/offers/${encodeURIComponent(id)}/apply`, {
      method: 'POST',
      body: payload || {},
    });
  }

  async createOffer(data: any) {
    return this.request<any>('/offers', {
      method: 'POST',
      body: data,
    });
  }

  async updateOffer(id: string, data: any) {
    return this.request<any>(`/offers/${id}`, {
      method: 'PATCH',
      body: data,
    });
  }

  async deleteOffer(id: string) {
    return this.request<any>(`/offers/${id}`, {
      method: 'DELETE',
    });
  }

  // HR Contacts
  async getHRContacts(params?: { companyId?: string; search?: string }) {
    const query = params ? '?' + new URLSearchParams(params as any).toString() : '';
    return this.request<any[]>(`/hr-contacts${query}`);
  }

  async getHRContact(id: string) {
    return this.request<any>(`/hr-contacts/${id}`);
  }

  async getCompanyHRContacts(companyId: string) {
    return this.request<any[]>(`/hr-contacts/company/${companyId}`);
  }

  async createHRContact(data: any) {
    return this.request<any>('/hr-contacts', {
      method: 'POST',
      body: data,
    });
  }

  async updateHRContact(id: string, data: any) {
    return this.request<any>(`/hr-contacts/${id}`, {
      method: 'PATCH',
      body: data,
    });
  }

  async deleteHRContact(id: string) {
    return this.request<any>(`/hr-contacts/${id}`, {
      method: 'DELETE',
    });
  }

  // Leads
  async submitLead(data: {
    offerId: string;
    companyId: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    employeeId?: string;
    message?: string;
  }) {
    return this.request<any>('/leads', {
      method: 'POST',
      body: data,
    });
  }

  async getVendorLeads(params?: {
    status?: string;
    offerId?: string;
    date_from?: string;
    date_to?: string;
  }) {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set('status', params.status);
    if (params?.offerId) searchParams.set('offerId', params.offerId);
    if (params?.date_from) searchParams.set('date_from', params.date_from);
    if (params?.date_to) searchParams.set('date_to', params.date_to);
    const query = searchParams.toString();
    return this.request<any[]>(`/vendor/leads${query ? `?${query}` : ''}`);
  }

  async getVendorLead(id: string) {
    return this.request<any>(`/vendor/leads/${encodeURIComponent(id)}`);
  }

  async getLeads(params?: { status?: string; companyId?: string; offerId?: string }) {
    const query = params ? '?' + new URLSearchParams(params as any).toString() : '';
    return this.request<any[]>(`/leads${query}`);
  }

  async updateLead(id: string, data: { status?: string; vendorNotes?: string }) {
    return this.request<any>(`/vendor/leads/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: data,
    });
  }

  async exportVendorLeadsCsv(params?: { status?: string; date_from?: string; date_to?: string }) {
    const searchParams = new URLSearchParams({ export: 'csv' });
    if (params?.status) searchParams.set('status', params.status);
    if (params?.date_from) searchParams.set('date_from', params.date_from);
    if (params?.date_to) searchParams.set('date_to', params.date_to);

    const headers: Record<string, string> = {};
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    const response = await fetch(`${API_BASE_URL}/vendor/leads?${searchParams.toString()}`, {
      method: 'GET',
      headers,
    });
    if (!response.ok) {
      throw new Error('Failed to export leads CSV');
    }
    return response.text();
  }

  async getMyApplications() {
    return this.request<{
      leads: Array<{
        id: string;
        offer_id: string;
        offer_title: string;
        company: { id: string; slug: string; name: string };
        vendor_name: string;
        status: string;
        created_at: string;
      }>;
    }>('/my-applications');
  }

  // Admin
  async getAdminStats() {
    return this.request<any>('/admin/stats');
  }

  async getVendorRequests(params?: { status?: string }) {
    const query = params ? '?' + new URLSearchParams(params as any).toString() : '';
    return this.request<any[]>(`/admin/vendor-requests${query}`);
  }

  async getAdminVendors(params?: { status?: string }) {
    const query = params ? '?' + new URLSearchParams(params as any).toString() : '';
    return this.request<any[]>(`/admin/vendors${query}`);
  }

  async reviewAdminVendor(id: string, status: 'APPROVED' | 'REJECTED') {
    return this.request<any>(`/admin/vendors/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: { status },
    });
  }

  async getAdminOffersReview(params?: { status?: string }) {
    const query = params ? '?' + new URLSearchParams(params as any).toString() : '';
    return this.request<any[]>(`/admin/offers-review${query}`);
  }

  async approveAdminOfferReview(id: string) {
    return this.request<any>(`/admin/offers-review/${encodeURIComponent(id)}/approve`, {
      method: 'POST',
    });
  }

  async rejectAdminOfferReview(id: string, complianceNotes: string) {
    return this.request<any>(`/admin/offers-review/${encodeURIComponent(id)}/reject`, {
      method: 'POST',
      body: { complianceNotes },
    });
  }

  async getVendorRequest(id: string) {
    return this.request<any>(`/admin/vendor-requests/${id}`);
  }

  async reviewVendorRequest(id: string, data: { status: 'APPROVED' | 'REJECTED'; reviewNotes?: string }) {
    return this.request<any>(`/admin/vendor-requests/${id}`, {
      method: 'PATCH',
      body: data,
    });
  }

  async getUsers(params?: { role?: string; search?: string }) {
    const query = params ? '?' + new URLSearchParams(params as any).toString() : '';
    return this.request<any[]>(`/admin/users${query}`);
  }

  async updateUserRole(id: string, role: string) {
    return this.request<any>(`/admin/users/${id}/role`, {
      method: 'PATCH',
      body: { role },
    });
  }

  async createVendorAsAdmin(data: any) {
    return this.request<any>('/admin/vendors', {
      method: 'POST',
      body: data,
    });
  }

  async getAdminVendorBillingPlan(vendorId: string) {
    return this.request<any>(`/admin/vendors/${encodeURIComponent(vendorId)}/billing-plan`);
  }

  async setAdminVendorBillingPlan(vendorId: string, data: any) {
    return this.request<any>(`/admin/vendors/${encodeURIComponent(vendorId)}/billing-plan`, {
      method: 'PUT',
      body: data,
    });
  }

  async generateAdminInvoices(period: string) {
    const query = new URLSearchParams({ period }).toString();
    return this.request<any>(`/admin/billing/generate-invoices?${query}`, {
      method: 'POST',
    });
  }

  async getAdminInvoices(params?: { vendorId?: string; status?: string; period?: string }) {
    const query = this.buildQuery(params as Record<string, unknown> | undefined);
    return this.request<any[]>(`/admin/invoices${query}`);
  }

  async getAdminInvoice(id: string) {
    return this.request<any>(`/admin/invoices/${encodeURIComponent(id)}`);
  }

  async updateAdminInvoiceStatus(id: string, status: 'SENT' | 'PAID' | 'VOID') {
    return this.request<any>(`/admin/invoices/${encodeURIComponent(id)}/status`, {
      method: 'PATCH',
      body: { status },
    });
  }

  async addAdminInvoiceLineItem(
    id: string,
    data: {
      description: string;
      quantity: number;
      unitPrice: number;
      itemType?: 'ADJUSTMENT' | 'LEADS' | 'SUBSCRIPTION';
      metadataJson?: Record<string, any>;
    }
  ) {
    return this.request<any>(`/admin/invoices/${encodeURIComponent(id)}/line-items`, {
      method: 'POST',
      body: data,
    });
  }

  // Finance
  async getFinanceVendorsSummary(params?: { start?: string; end?: string; vendorId?: string }) {
    const query = this.buildQuery(params as Record<string, unknown> | undefined);
    return this.request<any>(`/finance/vendors/summary${query}`);
  }

  async getFinanceVendorCharges(vendorId: string, params?: { start?: string; end?: string; status?: string }) {
    const query = this.buildQuery(params as Record<string, unknown> | undefined);
    return this.request<any>(`/finance/vendors/${vendorId}/charges${query}`);
  }

  async updateVendorBilling(vendorId: string, data: any) {
    return this.request<any>(`/finance/vendors/${vendorId}/billing`, {
      method: 'PATCH',
      body: data,
    });
  }

  async getFinanceInvoices(params?: { month?: string }) {
    const query = this.buildQuery(params as Record<string, unknown> | undefined);
    return this.request<any>(`/finance/invoices${query}`);
  }
}

export const api = new ApiService();
export default api;
