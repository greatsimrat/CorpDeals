const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

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

  private async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { method = 'GET', body, headers = {} } = options;

    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...headers,
    };

    if (this.token) {
      requestHeaders['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method,
      headers: requestHeaders,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || 'Request failed');
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

  async register(data: { email: string; password: string; name?: string; role?: string }) {
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

  logout() {
    this.setToken(null);
  }

  // Vendor Applications
  async submitVendorApplication(data: {
    companyName: string;
    contactName: string;
    email: string;
    phone?: string;
    website?: string;
    businessType?: string;
    description?: string;
    additionalInfo?: string;
    password: string;
  }) {
    return this.request<{ message: string; vendorId: string; requestId: string }>('/vendors/apply', {
      method: 'POST',
      body: data,
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

  async updateVendor(id: string, data: any) {
    return this.request<any>(`/vendors/${id}`, {
      method: 'PATCH',
      body: data,
    });
  }

  // Companies
  async getCompanies(params?: { search?: string; verified?: string }) {
    const query = params ? '?' + new URLSearchParams(params as any).toString() : '';
    return this.request<any[]>(`/companies${query}`);
  }

  async getCompany(idOrSlug: string) {
    return this.request<any>(`/companies/${idOrSlug}`);
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
    return this.request<any>(`/offers/${id}`);
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

  async getVendorLeads(params?: { status?: string; offerId?: string }) {
    const query = params ? '?' + new URLSearchParams(params as any).toString() : '';
    return this.request<any[]>(`/leads/vendor${query}`);
  }

  async getLeads(params?: { status?: string; companyId?: string; offerId?: string }) {
    const query = params ? '?' + new URLSearchParams(params as any).toString() : '';
    return this.request<any[]>(`/leads${query}`);
  }

  async updateLead(id: string, data: { status?: string; vendorNotes?: string }) {
    return this.request<any>(`/leads/${id}`, {
      method: 'PATCH',
      body: data,
    });
  }

  // Admin
  async getAdminStats() {
    return this.request<any>('/admin/stats');
  }

  async getVendorRequests(params?: { status?: string }) {
    const query = params ? '?' + new URLSearchParams(params as any).toString() : '';
    return this.request<any[]>(`/admin/vendor-requests${query}`);
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
}

export const api = new ApiService();
export default api;
