import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import api from '../../services/api';
import { getBillingReasonMessage } from '../../lib/billing-access';
import {
  AdminDashboardHeader,
  AdminKpiGrid,
  adminKpiIcons,
  AdminStickySummaryBar,
  ApprovalQueueSection,
  LeadRevenueAnalyticsSection,
  MarketplaceAlertsSection,
  PlanManagementSection,
  PricingConfigSection,
  VendorHealthSection,
  type AdminAlertItem,
  type AdminApprovalRow,
  type AdminKpiItem,
  type AdminPlanCard,
  type AdminPricingRow,
  type AdminRankedMetricRow,
  type AdminSummaryItem,
  type AdminVendorHealthRow,
} from '../../components/admin/dashboard/AdminDashboardSections';

type DashboardStats = {
  users: number;
  vendors: {
    total: number;
    pending: number;
    approved: number;
  };
  companies: number;
  offers: {
    total: number;
    active: number;
  };
  leads: number;
  leadSubmissions: {
    today: number;
    thisMonth: number;
    thisYear: number;
  };
};

type CategoryNode = {
  id: string;
  name: string;
  slug: string;
  parentId?: string | null;
  _count?: { offers?: number };
};

type OfferReviewApiRow = {
  id: string;
  title: string;
  categoryId?: string | null;
  updatedAt: string;
  vendorAttestationAcceptedAt?: string | null;
  vendor?: {
    id: string;
    companyName: string;
    email: string;
  };
  company?: {
    id: string;
    name: string;
  };
};

type BillingBlockedOfferRow = {
  offerId: string;
  blockingAccess?: {
    reasonCode?: string;
    message?: string;
    planName?: string;
  } | null;
};

type BillingAccess = {
  allowed: boolean;
  reasonCode?: string;
  message?: string;
  planName?: string;
  currentOfferCount?: number;
  maxAllowedOffers?: number | null;
};

type VendorEligibilityRow = {
  vendorId: string;
  vendorName: string;
  vendorStatus: string;
  offerCount: number;
  isFullyEligible: boolean;
  createAccess: BillingAccess;
  submitAccess: BillingAccess;
  publishAccess: BillingAccess;
};

type VendorBillingEligibilityResponse = {
  vendors: VendorEligibilityRow[];
};

type VendorRow = {
  id: string;
  companyName: string;
  status: string;
  _count?: {
    offers?: number;
    leads?: number;
  };
};

type LeadMonetizationResponse = {
  totals: {
    leadEvents: number;
    visibleLeads: number;
    lockedLeads: number;
  };
  vendorsLowBalance: Array<{
    vendorId: string;
    vendorName?: string | null;
    walletBalance: number;
    currencyCode?: string;
  }>;
  vendorsWithHighLockedLeads: Array<{
    vendorId: string;
    visibleLeads: number;
    lockedLeads: number;
    deliveredLeads: number;
    blockedLeads: number;
  }>;
};

type PricingApiRow = {
  id: string;
  categoryId: string;
  subcategoryId?: string | null;
  leadPrice: string | number;
  billingType: string;
  isActive: boolean;
  category?: { id: string; name: string };
  subcategory?: { id: string; name: string };
};

type PricingModelRow = AdminPricingRow & {
  categoryId: string;
  subcategoryId?: string | null;
};

type InvoiceRow = {
  id: string;
  total?: string | number;
  status?: string;
};

const toNumber = (value: unknown): number => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
};

const formatMoney = (value: number, currency = 'CAD') =>
  new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(value);

const normalizePlanKey = (value: string | undefined): 'FREE' | 'GOLD' | 'PREMIUM' | 'OTHER' => {
  const normalized = String(value || '').trim().toUpperCase();
  if (normalized.includes('FREE')) return 'FREE';
  if (normalized.includes('GOLD') || normalized.includes('GROWTH') || normalized.includes('STARTER')) return 'GOLD';
  if (normalized.includes('PREMIUM') || normalized.includes('PRO')) return 'PREMIUM';
  return 'OTHER';
};

const isWithinAgeFilter = (timestamp: string, ageFilter: string) => {
  if (ageFilter === 'all') return true;
  const ageMs = Date.now() - new Date(timestamp).getTime();
  if (ageFilter === '24h') return ageMs <= 24 * 60 * 60 * 1000;
  if (ageFilter === '3d') return ageMs <= 3 * 24 * 60 * 60 * 1000;
  if (ageFilter === '7d') return ageMs <= 7 * 24 * 60 * 60 * 1000;
  if (ageFilter === 'older') return ageMs > 7 * 24 * 60 * 60 * 1000;
  return true;
};

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [pendingOffers, setPendingOffers] = useState<OfferReviewApiRow[]>([]);
  const [approvedOffers, setApprovedOffers] = useState<OfferReviewApiRow[]>([]);
  const [rejectedOffers, setRejectedOffers] = useState<OfferReviewApiRow[]>([]);
  const [blockedOffers, setBlockedOffers] = useState<BillingBlockedOfferRow[]>([]);
  const [vendorEligibility, setVendorEligibility] = useState<VendorEligibilityRow[]>([]);
  const [vendors, setVendors] = useState<VendorRow[]>([]);
  const [analytics, setAnalytics] = useState<LeadMonetizationResponse | null>(null);
  const [pricingRows, setPricingRows] = useState<PricingModelRow[]>([]);
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [categories, setCategories] = useState<CategoryNode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmittingOfferId, setIsSubmittingOfferId] = useState<string | null>(null);
  const [isSavingPricing, setIsSavingPricing] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const [categoryFilter, setCategoryFilter] = useState('all');
  const [vendorFilter, setVendorFilter] = useState('all');
  const [ageFilter, setAgeFilter] = useState('all');

  const [selectedPricingRowId, setSelectedPricingRowId] = useState<string>('');
  const [editLeadPrice, setEditLeadPrice] = useState('');
  const [editBillingType, setEditBillingType] = useState<'PER_LEAD' | 'PER_SALE'>('PER_LEAD');
  const [editIsActive, setEditIsActive] = useState(true);

  const [showCreateOverride, setShowCreateOverride] = useState(false);
  const [overrideCategoryId, setOverrideCategoryId] = useState('');
  const [overrideSubcategoryId, setOverrideSubcategoryId] = useState('');
  const [overrideLeadPrice, setOverrideLeadPrice] = useState('');
  const [overrideBillingType, setOverrideBillingType] = useState<'PER_LEAD' | 'PER_SALE'>('PER_LEAD');
  const [overrideIsActive, setOverrideIsActive] = useState(true);

  const loadDashboard = async () => {
    try {
      setIsLoading(true);
      setError('');
      const now = new Date();
      const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

      const [
        statsData,
        pendingOffersData,
        approvedOffersData,
        rejectedOffersData,
        blockedData,
        vendorBillingData,
        analyticsData,
        pricingData,
        invoicesData,
        vendorsData,
        categoriesData,
      ] = await Promise.all([
        api.getAdminStats(),
        api.getAdminOffersReview({ status: 'SUBMITTED' }),
        api.getAdminOffersReview({ status: 'APPROVED' }),
        api.getAdminOffersReview({ status: 'REJECTED' }),
        api.getAdminBillingBlockedOffers({ limit: 300, statuses: ['SUBMITTED', 'APPROVED', 'LIVE'] }),
        api.getAdminVendorBillingEligibility({ invalidOnly: false }),
        api.getAdminLeadMonetizationAnalytics({ days: 30 }),
        api.getAdminCategoryLeadPricing({}),
        api.getAdminInvoices({ period }),
        api.getAdminVendors({ status: 'APPROVED' }),
        api.getCategories(),
      ]);

      setStats(statsData as DashboardStats);
      setPendingOffers((pendingOffersData || []) as OfferReviewApiRow[]);
      setApprovedOffers((approvedOffersData || []) as OfferReviewApiRow[]);
      setRejectedOffers((rejectedOffersData || []) as OfferReviewApiRow[]);
      setBlockedOffers((blockedData?.results || []) as BillingBlockedOfferRow[]);
      setVendorEligibility(((vendorBillingData as VendorBillingEligibilityResponse)?.vendors || []) as VendorEligibilityRow[]);
      setAnalytics((analyticsData || null) as LeadMonetizationResponse | null);
      setPricingRows(
        ((pricingData || []) as PricingApiRow[]).map((row) => ({
          id: row.id,
          categoryId: row.categoryId,
          subcategoryId: row.subcategoryId || null,
          categoryLabel: row.category?.name || 'Unknown category',
          subcategoryLabel: row.subcategory?.name || null,
          leadPrice: toNumber(row.leadPrice),
          billingType: row.billingType || 'PER_LEAD',
          isActive: Boolean(row.isActive),
        }))
      );
      setInvoices((invoicesData || []) as InvoiceRow[]);
      setVendors((vendorsData || []) as VendorRow[]);
      setCategories((categoriesData || []) as CategoryNode[]);
    } catch (err: any) {
      setError(err.message || 'Failed to load admin dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const blockedByOfferId = Object.fromEntries(
    blockedOffers.map((offer) => [offer.offerId, offer])
  ) as Record<string, BillingBlockedOfferRow>;

  const categoryById = Object.fromEntries(
    categories.map((category) => [category.id, category])
  ) as Record<string, CategoryNode>;

  const resolveCategoryPath = (categoryId?: string | null) => {
    if (!categoryId || !categoryById[categoryId]) {
      return { categoryLabel: 'Uncategorized', subcategoryLabel: 'General' };
    }
    const category = categoryById[categoryId];
    if (category.parentId && categoryById[category.parentId]) {
      return {
        categoryLabel: categoryById[category.parentId].name,
        subcategoryLabel: category.name,
      };
    }
    return {
      categoryLabel: category.name,
      subcategoryLabel: 'General',
    };
  };

  const allApprovalRows: AdminApprovalRow[] = pendingOffers.map((offer) => {
    const categoryPath = resolveCategoryPath(offer.categoryId || null);
    const blocked = blockedByOfferId[offer.id];
    const submittedAt = offer.vendorAttestationAcceptedAt || offer.updatedAt;
    return {
      id: offer.id,
      title: offer.title,
      vendorName: offer.vendor?.companyName || 'Unknown vendor',
      categoryLabel: categoryPath.categoryLabel,
      subcategoryLabel: categoryPath.subcategoryLabel,
      targetCompaniesCount: offer.company ? 1 : 0,
      submittedAt,
      isBillingBlocked: Boolean(blocked),
      blockingReason: blocked
        ? getBillingReasonMessage(blocked.blockingAccess?.reasonCode, blocked.blockingAccess?.message || undefined)
        : undefined,
    };
  });

  const availableCategories = Array.from(new Set(allApprovalRows.map((row) => row.categoryLabel))).sort();
  const availableVendors = Array.from(new Set(allApprovalRows.map((row) => row.vendorName))).sort();

  const filteredApprovalRows = allApprovalRows.filter((row) => {
    if (categoryFilter !== 'all' && row.categoryLabel !== categoryFilter) return false;
    if (vendorFilter !== 'all' && row.vendorName !== vendorFilter) return false;
    return isWithinAgeFilter(row.submittedAt, ageFilter);
  });

  const approvedToday = approvedOffers.filter((offer) => {
    const offerDate = new Date(offer.updatedAt);
    const now = new Date();
    return (
      offerDate.getDate() === now.getDate() &&
      offerDate.getMonth() === now.getMonth() &&
      offerDate.getFullYear() === now.getFullYear()
    );
  }).length;

  const rejectedToday = rejectedOffers.filter((offer) => {
    const offerDate = new Date(offer.updatedAt);
    const now = new Date();
    return (
      offerDate.getDate() === now.getDate() &&
      offerDate.getMonth() === now.getMonth() &&
      offerDate.getFullYear() === now.getFullYear()
    );
  }).length;

  const revenueThisCycle = invoices.reduce((sum, invoice) => sum + toNumber(invoice.total), 0);
  const lockedLeadsCount = analytics?.totals?.lockedLeads || 0;
  const lowBalanceVendorCount = analytics?.vendorsLowBalance?.length || 0;
  const highLockedVendorCount = analytics?.vendorsWithHighLockedLeads?.length || 0;

  const nearOfferLimitCount = vendorEligibility.filter((vendor) => {
    const count = toNumber(vendor.publishAccess?.currentOfferCount);
    const max = toNumber(vendor.publishAccess?.maxAllowedOffers);
    if (vendor.publishAccess?.reasonCode === 'VENDOR_PLAN_LIMIT_REACHED') return true;
    if (max <= 0) return false;
    return count / max >= 0.8;
  }).length;

  const summaryItems: AdminSummaryItem[] = [
    {
      label: 'Pending Approvals',
      value: String(filteredApprovalRows.length),
      tone: filteredApprovalRows.length > 15 ? 'danger' : filteredApprovalRows.length > 5 ? 'warning' : 'default',
    },
    {
      label: 'Vendors Low Balance',
      value: String(lowBalanceVendorCount),
      tone: lowBalanceVendorCount > 0 ? 'warning' : 'default',
    },
    {
      label: 'Locked Leads Waiting',
      value: String(lockedLeadsCount),
      tone: lockedLeadsCount > 0 ? 'warning' : 'default',
    },
    {
      label: 'Active Vendors',
      value: String(stats?.vendors?.approved || 0),
      tone: 'default',
    },
    {
      label: 'Revenue This Cycle',
      value: formatMoney(revenueThisCycle || 0),
      tone: 'default',
    },
  ];

  const kpiCards: AdminKpiItem[] = [
    { id: 'leads-today', title: 'Leads Today', value: String(stats?.leadSubmissions?.today || 0), icon: adminKpiIcons.leadsToday },
    { id: 'leads-cycle', title: 'Leads This Billing Cycle', value: String(stats?.leadSubmissions?.thisMonth || 0), icon: adminKpiIcons.leadsCycle },
    { id: 'revenue-cycle', title: 'Revenue Estimate This Cycle', value: formatMoney(revenueThisCycle || 0), icon: adminKpiIcons.revenue },
    { id: 'locked-leads', title: 'Hidden / Locked Leads', value: String(lockedLeadsCount), icon: adminKpiIcons.hidden, tone: lockedLeadsCount > 0 ? 'warning' : 'default' },
    { id: 'active-vendors', title: 'Active Vendors', value: String(stats?.vendors?.approved || 0), icon: adminKpiIcons.activeVendors },
    { id: 'pending-offers', title: 'Offers Pending Approval', value: String(filteredApprovalRows.length), icon: adminKpiIcons.approvals, tone: filteredApprovalRows.length > 10 ? 'warning' : 'default' },
    { id: 'offer-limit-risk', title: 'Vendors Near Offer Limit', value: String(nearOfferLimitCount), icon: adminKpiIcons.offerLimit, tone: nearOfferLimitCount > 0 ? 'warning' : 'default' },
    { id: 'lead-limit-risk', title: 'Vendors Near Lead Limit', value: String(highLockedVendorCount), icon: adminKpiIcons.leadLimit, tone: highLockedVendorCount > 0 ? 'warning' : 'default' },
  ];

  const lowBalanceByVendorId = Object.fromEntries(
    (analytics?.vendorsLowBalance || []).map((row) => [row.vendorId, row])
  ) as Record<string, { walletBalance: number; currencyCode?: string; vendorName?: string | null }>;
  const highLockedByVendorId = Object.fromEntries(
    (analytics?.vendorsWithHighLockedLeads || []).map((row) => [row.vendorId, row])
  ) as Record<string, { lockedLeads: number; visibleLeads: number; deliveredLeads: number; blockedLeads: number }>;

  const vendorHealthRows: AdminVendorHealthRow[] = vendors
    .map((vendor) => {
      const eligibility = vendorEligibility.find((entry) => entry.vendorId === vendor.id);
      const wallet = lowBalanceByVendorId[vendor.id];
      const lockStats = highLockedByVendorId[vendor.id];
      const access = eligibility?.publishAccess || eligibility?.submitAccess || eligibility?.createAccess;

      const planName = access?.planName || 'No plan';
      const maxAllowedOffers = access?.maxAllowedOffers;
      const currentOfferCount = toNumber(access?.currentOfferCount ?? vendor._count?.offers);
      const offerLimitLabel =
        maxAllowedOffers === null || maxAllowedOffers === undefined || Number(maxAllowedOffers) <= 0
          ? 'Unlimited'
          : String(maxAllowedOffers);

      let riskLabel = '';
      let riskTone: 'warning' | 'danger' | undefined;
      if (!eligibility?.isFullyEligible) {
        riskLabel = getBillingReasonMessage(access?.reasonCode, access?.message || undefined);
        riskTone = 'danger';
      } else if (wallet && wallet.walletBalance <= 20) {
        riskLabel = 'Low wallet balance may block lead visibility soon.';
        riskTone = 'warning';
      } else if ((lockStats?.lockedLeads || 0) > 0) {
        riskLabel = `${lockStats?.lockedLeads || 0} hidden leads waiting to be unlocked.`;
        riskTone = 'warning';
      }

      return {
        vendorId: vendor.id,
        vendorName: vendor.companyName,
        planName,
        activeOffers: currentOfferCount,
        offerLimitLabel,
        leadsUsageLabel: `${lockStats?.visibleLeads || 0} visible`,
        hiddenLeads: lockStats?.lockedLeads || 0,
        walletBalanceLabel: wallet ? formatMoney(wallet.walletBalance, wallet.currencyCode || 'CAD') : 'Not available',
        statusLabel: vendor.status,
        riskLabel: riskLabel || undefined,
        riskTone,
      };
    })
    .filter((row) => row.riskLabel)
    .slice(0, 12);

  const topVendorsVisible: AdminRankedMetricRow[] = (analytics?.vendorsWithHighLockedLeads || [])
    .slice()
    .sort((a, b) => b.visibleLeads - a.visibleLeads)
    .slice(0, 6)
    .map((row) => ({
      id: `visible-${row.vendorId}`,
      label: vendorEligibility.find((entry) => entry.vendorId === row.vendorId)?.vendorName || row.vendorId,
      value: row.visibleLeads,
      helper: `${row.deliveredLeads} delivered`,
    }));

  const topVendorsHidden: AdminRankedMetricRow[] = (analytics?.vendorsWithHighLockedLeads || [])
    .slice()
    .sort((a, b) => b.lockedLeads - a.lockedLeads)
    .slice(0, 6)
    .map((row) => ({
      id: `hidden-${row.vendorId}`,
      label: vendorEligibility.find((entry) => entry.vendorId === row.vendorId)?.vendorName || row.vendorId,
      value: row.lockedLeads,
      helper: `${row.blockedLeads} blocked events`,
    }));

  const topCompaniesBySubmission: AdminRankedMetricRow[] = Object.entries(
    allApprovalRows.reduce<Record<string, number>>((acc, row) => {
      const offer = pendingOffers.find((item) => item.id === row.id);
      const company = offer?.company?.name || 'Unknown company';
      acc[company] = (acc[company] || 0) + 1;
      return acc;
    }, {})
  )
    .map(([label, value]) => ({ id: `company-${label}`, label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  const planCounts = vendorEligibility.reduce(
    (acc, vendor) => {
      const key = normalizePlanKey(vendor.publishAccess?.planName || vendor.createAccess?.planName);
      if (key !== 'OTHER') acc[key] += 1;
      return acc;
    },
    { FREE: 0, GOLD: 0, PREMIUM: 0 }
  );

  const planCards: AdminPlanCard[] = [
    {
      id: 'FREE',
      name: 'Free',
      monthlyPriceLabel: '$0 / month',
      maxActiveOffersLabel: '50',
      includedLeadsLabel: '10 / cycle',
      overageLabel: 'Enabled',
      activeVendors: planCounts.FREE,
    },
    {
      id: 'GOLD',
      name: 'Gold',
      monthlyPriceLabel: '$100 CAD / month',
      maxActiveOffersLabel: '100',
      includedLeadsLabel: '20 / cycle',
      overageLabel: 'Enabled',
      activeVendors: planCounts.GOLD,
    },
    {
      id: 'PREMIUM',
      name: 'Premium',
      monthlyPriceLabel: '$250 CAD / month',
      maxActiveOffersLabel: '250',
      includedLeadsLabel: '50 / cycle',
      overageLabel: 'Enabled',
      activeVendors: planCounts.PREMIUM,
    },
  ];

  const alertCards: AdminAlertItem[] = [
    ...(filteredApprovalRows.length > 0
      ? [{
          id: 'pending-approvals',
          title: `${filteredApprovalRows.length} offers pending approval`,
          description: 'Review the queue quickly to maintain launch SLAs and reduce vendor wait time.',
          ctaLabel: 'Review queue',
          ctaHref: '/admin/offers-review',
          tone: filteredApprovalRows.length > 15 ? 'danger' : 'warning',
        } as AdminAlertItem]
      : []),
    ...(lockedLeadsCount > 0
      ? [{
          id: 'locked-leads',
          title: `${lockedLeadsCount} locked leads waiting`,
          description: 'Hidden lead volume is rising. Prompt vendors to top up or move plans.',
          ctaLabel: 'Review vendor billing risk',
          ctaHref: '/admin/vendors',
          tone: 'warning',
        } as AdminAlertItem]
      : []),
    ...(lowBalanceVendorCount > 0
      ? [{
          id: 'low-balance-vendors',
          title: `${lowBalanceVendorCount} vendors are low on balance`,
          description: 'Vendors with low wallet balance may stop receiving unlocked leads.',
          ctaLabel: 'Open vendors',
          ctaHref: '/admin/vendors',
          tone: 'warning',
        } as AdminAlertItem]
      : []),
    ...(blockedOffers.length > 0
      ? [{
          id: 'billing-blocked-offers',
          title: `${blockedOffers.length} offers blocked by billing`,
          description: 'These offers cannot remain compliant and live until billing eligibility is restored.',
          ctaLabel: 'Review blocked offers',
          ctaHref: '/admin/offers-review',
          tone: 'danger',
        } as AdminAlertItem]
      : []),
  ];

  const pricingAction = (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => setShowCreateOverride((value) => !value)}
        className="inline-flex min-h-10 items-center rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
      >
        {showCreateOverride ? 'Close override form' : 'Add override'}
      </button>
    </div>
  );

  const handleApproveOffer = async (offerId: string) => {
    try {
      setIsSubmittingOfferId(offerId);
      setError('');
      await api.approveAdminOfferReview(offerId);
      setSuccessMessage('Offer approved.');
      await loadDashboard();
    } catch (err: any) {
      setError(err.message || 'Failed to approve offer');
    } finally {
      setIsSubmittingOfferId(null);
    }
  };

  const handleRejectOffer = async (offerId: string) => {
    const reason = window.prompt('Add rejection reason (minimum 8 characters):', 'Needs policy/compliance updates.');
    if (reason === null) return;
    if (reason.trim().length < 8) {
      setError('Rejection reason must be at least 8 characters.');
      return;
    }
    try {
      setIsSubmittingOfferId(offerId);
      setError('');
      await api.rejectAdminOfferReview(offerId, reason.trim());
      setSuccessMessage('Offer rejected.');
      await loadDashboard();
    } catch (err: any) {
      setError(err.message || 'Failed to reject offer');
    } finally {
      setIsSubmittingOfferId(null);
    }
  };

  const selectedPricingRow = pricingRows.find((row) => row.id === selectedPricingRowId);

  const beginEditPricingRow = (rowId: string) => {
    const row = pricingRows.find((item) => item.id === rowId);
    if (!row) return;
    setSelectedPricingRowId(row.id);
    setEditLeadPrice(String(row.leadPrice));
    setEditBillingType((row.billingType as 'PER_LEAD' | 'PER_SALE') || 'PER_LEAD');
    setEditIsActive(Boolean(row.isActive));
  };

  const saveSelectedPricingRow = async () => {
    if (!selectedPricingRow) return;
    const leadPrice = toNumber(editLeadPrice);
    if (leadPrice < 0) {
      setError('Lead price must be non-negative.');
      return;
    }
    try {
      setIsSavingPricing(true);
      setError('');
      await api.saveAdminCategoryLeadPricing({
        categoryId: selectedPricingRow.categoryId,
        subcategoryId: selectedPricingRow.subcategoryId || null,
        leadPrice,
        billingType: editBillingType,
        isActive: editIsActive,
      });
      setSuccessMessage('Pricing row updated.');
      await loadDashboard();
    } catch (err: any) {
      setError(err.message || 'Failed to update pricing row');
    } finally {
      setIsSavingPricing(false);
    }
  };

  const subcategoriesForSelectedCategory = categories.filter(
    (category) => category.parentId && category.parentId === overrideCategoryId
  );

  const createOverride = async () => {
    const leadPrice = toNumber(overrideLeadPrice);
    if (!overrideCategoryId || leadPrice < 0) {
      setError('Category and valid lead price are required.');
      return;
    }
    try {
      setIsSavingPricing(true);
      setError('');
      await api.saveAdminCategoryLeadPricing({
        categoryId: overrideCategoryId,
        subcategoryId: overrideSubcategoryId || null,
        leadPrice,
        billingType: overrideBillingType,
        isActive: overrideIsActive,
      });
      setSuccessMessage('Pricing override saved.');
      setShowCreateOverride(false);
      setOverrideCategoryId('');
      setOverrideSubcategoryId('');
      setOverrideLeadPrice('');
      setOverrideBillingType('PER_LEAD');
      setOverrideIsActive(true);
      await loadDashboard();
    } catch (err: any) {
      setError(err.message || 'Failed to save override');
    } finally {
      setIsSavingPricing(false);
    }
  };

  const scrollToSection = (id: string) => {
    const node = document.getElementById(id);
    if (node) {
      node.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AdminDashboardHeader
        pendingApprovals={filteredApprovalRows.length}
        onScrollToPricing={() => scrollToSection('pricing-config')}
        onScrollToPlans={() => scrollToSection('plan-management')}
      />

      {successMessage ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-700">
          {successMessage}
        </div>
      ) : null}
      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-700">{error}</div>
      ) : null}

      <AdminStickySummaryBar items={summaryItems} />

      <ApprovalQueueSection
        pendingOffers={filteredApprovalRows}
        approvedToday={approvedToday}
        rejectedToday={rejectedToday}
        isSubmittingId={isSubmittingOfferId}
        onApprove={handleApproveOffer}
        onReject={handleRejectOffer}
        categoryFilter={categoryFilter}
        vendorFilter={vendorFilter}
        ageFilter={ageFilter}
        onCategoryFilterChange={setCategoryFilter}
        onVendorFilterChange={setVendorFilter}
        onAgeFilterChange={setAgeFilter}
        availableCategories={availableCategories}
        availableVendors={availableVendors}
      />

      <AdminKpiGrid items={kpiCards} />

      <VendorHealthSection rows={vendorHealthRows} />

      <LeadRevenueAnalyticsSection
        leadsByCategory={[]}
        leadsBySubcategory={[]}
        revenueByCategory={[]}
        topVendorsVisible={topVendorsVisible}
        topVendorsHidden={topVendorsHidden}
        topCompanies={topCompaniesBySubmission}
      />

      <PricingConfigSection
        rows={pricingRows}
        editAction={pricingAction}
        mobileListAction={pricingAction}
      />

      {pricingRows.length > 0 ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <h3 className="text-base font-semibold text-slate-900">Edit pricing row</h3>
          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-5">
            <label className="text-sm text-slate-700 md:col-span-2">
              Pricing row
              <select
                value={selectedPricingRowId}
                onChange={(event) => beginEditPricingRow(event.target.value)}
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2"
              >
                <option value="">Select row...</option>
                {pricingRows.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.categoryLabel} {row.subcategoryLabel ? `/ ${row.subcategoryLabel}` : '/ default'}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm text-slate-700">
              Lead price
              <input
                type="number"
                min="0"
                step="0.01"
                value={editLeadPrice}
                onChange={(event) => setEditLeadPrice(event.target.value)}
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </label>
            <label className="text-sm text-slate-700">
              Billing type
              <select
                value={editBillingType}
                onChange={(event) => setEditBillingType(event.target.value as 'PER_LEAD' | 'PER_SALE')}
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2"
              >
                <option value="PER_LEAD">PER_LEAD</option>
                <option value="PER_SALE">PER_SALE</option>
              </select>
            </label>
            <label className="text-sm text-slate-700">
              State
              <select
                value={editIsActive ? 'ACTIVE' : 'INACTIVE'}
                onChange={(event) => setEditIsActive(event.target.value === 'ACTIVE')}
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2"
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
              </select>
            </label>
          </div>
          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={saveSelectedPricingRow}
              disabled={!selectedPricingRow || isSavingPricing}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
            >
              {isSavingPricing ? 'Saving...' : 'Save pricing row'}
            </button>
          </div>
        </section>
      ) : null}

      {showCreateOverride ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <h3 className="text-base font-semibold text-slate-900">Create category or subcategory override</h3>
          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-5">
            <label className="text-sm text-slate-700 md:col-span-2">
              Category
              <select
                value={overrideCategoryId}
                onChange={(event) => {
                  setOverrideCategoryId(event.target.value);
                  setOverrideSubcategoryId('');
                }}
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2"
              >
                <option value="">Select category...</option>
                {categories.filter((category) => !category.parentId).map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm text-slate-700">
              Subcategory (optional)
              <select
                value={overrideSubcategoryId}
                onChange={(event) => setOverrideSubcategoryId(event.target.value)}
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2"
              >
                <option value="">Category default</option>
                {subcategoriesForSelectedCategory.map((subcategory) => (
                  <option key={subcategory.id} value={subcategory.id}>
                    {subcategory.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm text-slate-700">
              Lead price
              <input
                type="number"
                min="0"
                step="0.01"
                value={overrideLeadPrice}
                onChange={(event) => setOverrideLeadPrice(event.target.value)}
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </label>
            <label className="text-sm text-slate-700">
              Billing type
              <select
                value={overrideBillingType}
                onChange={(event) => setOverrideBillingType(event.target.value as 'PER_LEAD' | 'PER_SALE')}
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2"
              >
                <option value="PER_LEAD">PER_LEAD</option>
                <option value="PER_SALE">PER_SALE</option>
              </select>
            </label>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <input
              id="override-state"
              type="checkbox"
              checked={overrideIsActive}
              onChange={(event) => setOverrideIsActive(event.target.checked)}
            />
            <label htmlFor="override-state" className="text-sm text-slate-700">
              Mark as active
            </label>
          </div>
          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={createOverride}
              disabled={isSavingPricing}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
            >
              {isSavingPricing ? 'Saving...' : 'Save override'}
            </button>
          </div>
        </section>
      ) : null}

      <PlanManagementSection plans={planCards} />

      <MarketplaceAlertsSection alerts={alertCards} />
    </div>
  );
}
