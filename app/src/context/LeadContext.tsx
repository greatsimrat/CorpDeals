import React, { createContext, useContext, useState, useCallback } from 'react';

export interface Lead {
  id: string;
  offerId: string;
  companyId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  employeeId?: string;
  message?: string;
  status: 'new' | 'contacted' | 'qualified' | 'converted' | 'closed';
  createdAt: string;
  vendorNotes?: string;
}

interface LeadContextType {
  leads: Lead[];
  addLead: (lead: Omit<Lead, 'id' | 'createdAt' | 'status'>) => Lead;
  updateLeadStatus: (leadId: string, status: Lead['status']) => void;
  getLeadsByOffer: (offerId: string) => Lead[];
  getLeadsByCompany: (companyId: string) => Lead[];
  getLeadsByVendor: (vendorName: string) => Lead[];
  getLeadStats: () => { total: number; new: number; contacted: number; converted: number };
}

const LeadContext = createContext<LeadContextType | undefined>(undefined);

// Sample initial leads
const initialLeads: Lead[] = [
  {
    id: 'lead-001',
    offerId: 'coast-capital-mortgage',
    companyId: 'amazon',
    firstName: 'John',
    lastName: 'Smith',
    email: 'john.smith@amazon.com',
    phone: '(604) 555-0123',
    employeeId: 'AMZ-78432',
    status: 'contacted',
    createdAt: '2026-02-08T10:30:00Z',
    vendorNotes: 'Interested in refinancing, good credit score',
  },
  {
    id: 'lead-002',
    offerId: 'kia-bc-discount',
    companyId: 'amazon',
    firstName: 'Sarah',
    lastName: 'Chen',
    email: 's.chen@amazon.com',
    phone: '(604) 555-0456',
    status: 'new',
    createdAt: '2026-02-09T14:15:00Z',
  },
  {
    id: 'lead-003',
    offerId: 'telus-employee-plan',
    companyId: 'amazon',
    firstName: 'Michael',
    lastName: 'Johnson',
    email: 'm.johnson@amazon.com',
    status: 'converted',
    createdAt: '2026-02-05T09:00:00Z',
    vendorNotes: 'Switched family plan, 4 lines',
  },
];

export const LeadProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [leads, setLeads] = useState<Lead[]>(initialLeads);

  const addLead = useCallback((leadData: Omit<Lead, 'id' | 'createdAt' | 'status'>): Lead => {
    const newLead: Lead = {
      ...leadData,
      id: `lead-${Date.now()}`,
      createdAt: new Date().toISOString(),
      status: 'new',
    };
    setLeads(prev => [newLead, ...prev]);
    return newLead;
  }, []);

  const updateLeadStatus = useCallback((leadId: string, status: Lead['status']) => {
    setLeads(prev =>
      prev.map(lead =>
        lead.id === leadId ? { ...lead, status } : lead
      )
    );
  }, []);

  const getLeadsByOffer = useCallback((offerId: string) => {
    return leads.filter(lead => lead.offerId === offerId);
  }, [leads]);

  const getLeadsByCompany = useCallback((companyId: string) => {
    return leads.filter(lead => lead.companyId === companyId);
  }, [leads]);

  const getLeadsByVendor = useCallback((_vendorName: string) => {
    // This would need vendor mapping in real implementation
    return leads;
  }, [leads]);

  const getLeadStats = useCallback(() => {
    return {
      total: leads.length,
      new: leads.filter(l => l.status === 'new').length,
      contacted: leads.filter(l => l.status === 'contacted').length,
      converted: leads.filter(l => l.status === 'converted').length,
    };
  }, [leads]);

  return (
    <LeadContext.Provider
      value={{
        leads,
        addLead,
        updateLeadStatus,
        getLeadsByOffer,
        getLeadsByCompany,
        getLeadsByVendor,
        getLeadStats,
      }}
    >
      {children}
    </LeadContext.Provider>
  );
};

export const useLeads = () => {
  const context = useContext(LeadContext);
  if (context === undefined) {
    throw new Error('useLeads must be used within a LeadProvider');
  }
  return context;
};
