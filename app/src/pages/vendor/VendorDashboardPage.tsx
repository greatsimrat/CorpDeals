import { useEffect, useMemo, useState } from 'react';
import { FileDown } from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import {
  BillingWalletSection,
  CompanyCoverageExpansionSection,
  GrowthSuggestionsSection,
  HiddenLeadsAlertCard,
  HiddenLeadsSection,
  OfferPerformanceSection,
  VendorDashboardHeader,
  VendorDashboardSectionIcon,
  VendorKpiCard,
  VendorStickySummaryBar,
} from '../../components/vendor/dashboard/VendorDashboardSections';
import type {
  DashboardOfferPerformanceRow,
  GrowthSuggestion,
  HiddenLeadTeaser,
  WalletTransactionRow,
} from '../../components/vendor/dashboard/VendorDashboardSections';

type SummaryMetrics = {
  leads_today: number;
  leads_month: number;
  active_offers: number;
  qualified_leads: number;
  leads_sent: number;
  hidden_leads?: number;
};

type CompanyBreakdownRow = {
  company_id: string;
  company_name: string;
  leads_30_days: number;
  total_leads: number;
  qualified_leads: number;
};

type OfferPerformanceRow = {
  offer_id: string;
  offer_title: string;
  company_id: string;
  company_name: string;
  leads_30_days: number;
  total_leads: number;
  status: 'Active' | 'Inactive';
};

type VendorProfile = {
  id: string;
  companyName: string;
  status: string;
};

type VendorOffer = {
  id: string;
  title: string;
  productName?: string | null;
  active?: boolean;
  offerState?: string;
  offerStatus?: string;
  company?: { id: string; name: string; slug: string };
  _count?: { leads?: number };
};

type VendorLead = {
  id: string;
  createdAt: string;
  visibilityStatus?: 'VISIBLE' | 'LOCKED';
  lockedReason?: 'PLAN_LIMIT' | 'NO_BALANCE' | null;
  userProvinceCodeAtSubmission?: string | null;
  userCityAtSubmission?: string | null;
  payloadJson?: Record<string, unknown> | null;
  offer?: {
    id: string;
    title: string;
    productName?: string | null;
  };
  company?: {
    id: string;
    name: string;
  };
};

type BillingSnapshot = {
  activePlan: any | null;
  planDisplayName?: string;
  canCreateOffer?: boolean;
  canPublishOffer?: boolean;
  createOfferMessage?: string;
  publishOfferMessage?: string;
  offerLimit?: number | null;
  managedOfferCount?: number;
  remainingOfferSlots?: number | null;
  hiddenLeadCount?: number;
  walletBalance?: string;
  currencyCode?: string;
  includedLeadsTotal?: number;
  includedLeadsUsed?: number;
  walletTransactions?: any[];
};

type CompanyListRow = {
  id: string;
  name: string;
  slug: string;
};

const defaultSummary: SummaryMetrics = {
  leads_today: 0,
  leads_month: 0,
  active_offers: 0,
  qualified_leads: 0,
  leads_sent: 0,
  hidden_leads: 0,
};

const asNumber = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatCurrency = (value: number, currency = 'CAD') =>
  new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency,
  }).format(value || 0);

const toCampaignKey = (offer: VendorOffer) =>
  String(offer.productName || offer.title || '')
    .trim()
    .toLowerCase();

const resolveOfferStatusLabel = (offer?: VendorOffer) => {
  if (!offer) return 'Unknown';
  const state = String(offer.offerState || '').toUpperCase();
  if (offer.active && state === 'APPROVED') return 'Live';
  if (state === 'SUBMITTED') return 'Pending approval';
  if (state === 'REJECTED') return 'Rejected';
  if (state === 'CANCELLED') return 'Cancelled';
  if (state === 'APPROVED' && !offer.active) return 'Paused';
  return 'Draft';
};

export default function VendorDashboardPage() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<SummaryMetrics>(defaultSummary);
  const [companyBreakdown, setCompanyBreakdown] = useState<CompanyBreakdownRow[]>([]);
  const [offerPerformance, setOfferPerformance] = useState<OfferPerformanceRow[]>([]);
  const [profile, setProfile] = useState<VendorProfile | null>(null);
  const [billing, setBilling] = useState<BillingSnapshot | null>(null);
  const [vendorOffers, setVendorOffers] = useState<VendorOffer[]>([]);
  const [recentVendorLeads, setRecentVendorLeads] = useState<VendorLead[]>([]);
  const [allCompanies, setAllCompanies] = useState<CompanyListRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [isToppingUp, setIsToppingUp] = useState(false);
  const [error, setError] = useState('');

  const loadDashboard = async () => {
    try {
      setIsLoading(true);
      setError('');

      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - 29);
      const fromDateStr = fromDate.toISOString().slice(0, 10);

      const [
        summaryData,
        companyData,
        offerData,
        profileData,
        billingData,
        offersData,
        leadsData,
        companiesData,
      ] = await Promise.all([
        api.getVendorDashboardSummary(),
        api.getVendorDashboardCompanyBreakdown(),
        api.getVendorDashboardOfferPerformance(),
        api.getVendorProfile(),
        api.getVendorBilling(),
        api.getVendorOffers(),
        api.getVendorLeads({ date_from: fromDateStr }),
        api.getCompanies(),
      ]);

      setSummary(summaryData);
      setCompanyBreakdown(companyData);
      setOfferPerformance(offerData);
      setProfile(profileData as VendorProfile);
      setBilling(billingData as BillingSnapshot);
      setVendorOffers((offersData || []) as VendorOffer[]);
      setRecentVendorLeads((leadsData || []) as VendorLead[]);
      setAllCompanies((companiesData || []) as CompanyListRow[]);
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const handleExportCsv = async () => {
    try {
      setIsExporting(true);
      const csv = await api.exportVendorLeadsCsv();
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `vendor-leads-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.message || 'Failed to export leads');
    } finally {
      setIsExporting(false);
    }
  };

  const handleQuickTopUp = async (amount: number) => {
    try {
      setIsToppingUp(true);
      setError('');
      await api.topUpVendorWallet(amount);
      await loadDashboard();
    } catch (err: any) {
      setError(err.message || 'Failed to top up wallet');
    } finally {
      setIsToppingUp(false);
    }
  };

  const hiddenLeadTeasers = useMemo<HiddenLeadTeaser[]>(() => {
    return recentVendorLeads
      .filter((lead) => String(lead.visibilityStatus || '').toUpperCase() === 'LOCKED')
      .slice(0, 12)
      .map((lead) => {
        const payload = lead.payloadJson || {};
        const city =
          String(lead.userCityAtSubmission || payload.userCity || '').trim() || 'Unknown city';
        const province =
          String(lead.userProvinceCodeAtSubmission || payload.userProvinceCode || '').trim() || 'N/A';
        const locationLabel = [city, province].filter(Boolean).join(', ');
        const categoryLabel =
          String(lead.offer?.productName || '').trim() || 'Category unavailable';
        return {
          id: lead.id,
          companyName: lead.company?.name || 'Unknown company',
          locationLabel,
          categoryLabel,
          createdAt: lead.createdAt,
          lockedReason: lead.lockedReason || null,
        };
      });
  }, [recentVendorLeads]);

  const hiddenLeadCount = useMemo(() => {
    const summaryCount = Number(summary.hidden_leads || 0);
    const billingCount = Number(billing?.hiddenLeadCount || 0);
    const listCount = hiddenLeadTeasers.length;
    return Math.max(summaryCount, billingCount, listCount);
  }, [billing?.hiddenLeadCount, hiddenLeadTeasers.length, summary.hidden_leads]);

  const includedLeadsTotal = Number(
    billing?.includedLeadsTotal ??
      billing?.activePlan?.includedLeadsPerCycle ??
      billing?.activePlan?.includedLeadsPerMonth ??
      0
  );
  const includedLeadsUsed = Number(billing?.includedLeadsUsed ?? 0);
  const includedRemaining = Math.max(includedLeadsTotal - includedLeadsUsed, 0);
  const walletBalance = asNumber(billing?.walletBalance);
  const walletCurrency = String(billing?.currencyCode || billing?.activePlan?.currency || 'CAD');

  const walletTransactions = useMemo<WalletTransactionRow[]>(() => {
    return (billing?.walletTransactions || []).map((tx: any) => ({
      id: String(tx.id),
      type: String(tx.type || ''),
      amount: asNumber(tx.amount),
      balanceAfter: asNumber(tx.balanceAfter),
      createdAt: String(tx.createdAt || new Date().toISOString()),
    }));
  }, [billing?.walletTransactions]);

  const walletSpendThisCycle = useMemo(() => {
    return walletTransactions
      .filter((tx) => tx.type === 'LEAD_CHARGE')
      .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
  }, [walletTransactions]);

  const hiddenLeadsByOfferId = useMemo(() => {
    const counts = new Map<string, number>();
    recentVendorLeads
      .filter((lead) => String(lead.visibilityStatus || '').toUpperCase() === 'LOCKED')
      .forEach((lead) => {
      const offerId = lead.offer?.id;
      if (!offerId) return;
      counts.set(offerId, (counts.get(offerId) || 0) + 1);
    });
    return counts;
  }, [recentVendorLeads]);

  const targetCompaniesByCampaign = useMemo(() => {
    const campaignMap = new Map<string, Set<string>>();
    vendorOffers.forEach((offer) => {
      const key = toCampaignKey(offer);
      if (!key) return;
      const companyId = String(offer.company?.id || '').trim();
      if (!companyId) return;
      if (!campaignMap.has(key)) campaignMap.set(key, new Set());
      campaignMap.get(key)!.add(companyId);
    });
    return campaignMap;
  }, [vendorOffers]);

  const vendorOfferById = useMemo(() => {
    return new Map(vendorOffers.map((offer) => [offer.id, offer]));
  }, [vendorOffers]);

  const offerRows = useMemo<DashboardOfferPerformanceRow[]>(() => {
    if (offerPerformance.length === 0 && vendorOffers.length === 0) return [];

    if (offerPerformance.length === 0) {
      return vendorOffers.map((offer) => {
        const key = toCampaignKey(offer);
        return {
          offerId: offer.id,
          offerName: offer.title,
          companyName: offer.company?.name || '-',
          targetCompaniesCount: targetCompaniesByCampaign.get(key)?.size || 1,
          leads: Number(offer._count?.leads || 0),
          hiddenLeads: hiddenLeadsByOfferId.get(offer.id) || 0,
          statusLabel: resolveOfferStatusLabel(offer),
          isActive: Boolean(offer.active),
          editHref: `/vendor/offers/${offer.id}/edit`,
          cloneHref: '/vendor/offers',
        };
      });
    }

    return offerPerformance.map((row) => {
      const sourceOffer = vendorOfferById.get(row.offer_id);
      const campaignKey = toCampaignKey(sourceOffer || { id: row.offer_id, title: row.offer_title });
      const inferredStatus = resolveOfferStatusLabel(sourceOffer);
      const isActive = sourceOffer ? Boolean(sourceOffer.active) : row.status === 'Active';
      return {
        offerId: row.offer_id,
        offerName: row.offer_title,
        companyName: row.company_name,
        targetCompaniesCount: targetCompaniesByCampaign.get(campaignKey)?.size || 1,
        leads: row.total_leads,
        hiddenLeads: hiddenLeadsByOfferId.get(row.offer_id) || 0,
        statusLabel: inferredStatus || row.status,
        isActive,
        editHref: `/vendor/offers/${row.offer_id}/edit`,
        cloneHref: '/vendor/offers',
      };
    });
  }, [hiddenLeadsByOfferId, offerPerformance, targetCompaniesByCampaign, vendorOfferById, vendorOffers]);

  const topPerformingOffer = useMemo(() => {
    if (offerRows.length === 0) return 'No active offer yet';
    const sorted = [...offerRows].sort((a, b) => b.leads - a.leads);
    return sorted[0]?.offerName || 'No active offer yet';
  }, [offerRows]);

  const totalCompanies = allCompanies.length;
  const totalTrackedLeads = useMemo(
    () => companyBreakdown.reduce((sum, row) => sum + Number(row.total_leads || 0), 0),
    [companyBreakdown]
  );
  const targetedCompanyIds = useMemo(() => {
    return new Set(
      vendorOffers
        .map((offer) => String(offer.company?.id || '').trim())
        .filter(Boolean)
    );
  }, [vendorOffers]);
  const targetedCompanyCount = targetedCompanyIds.size;
  const missingCompanyCount =
    totalCompanies > 0 ? Math.max(totalCompanies - targetedCompanyCount, 0) : 0;
  const averageLeadsPerTargetCompany =
    targetedCompanyCount > 0
      ? (summary.leads_month > 0 ? summary.leads_month : totalTrackedLeads) /
        Math.max(targetedCompanyCount, 1)
      : 0;
  const estimatedMissedLeads = Math.round(
    averageLeadsPerTargetCompany * missingCompanyCount
  );
  const suggestedCompanies = allCompanies
    .filter((company) => !targetedCompanyIds.has(String(company.id)))
    .slice(0, 8)
    .map((company) => company.name);

  const estimatedHiddenLeadValue = useMemo(() => {
    const leadValue = asNumber(
      billing?.activePlan?.overagePricePerLead ?? 15
    );
    return formatCurrency(hiddenLeadCount * leadValue, walletCurrency);
  }, [billing?.activePlan?.overagePricePerLead, hiddenLeadCount, walletCurrency]);

  const summaryBarItems = useMemo(() => {
    const offerLimit =
      billing?.offerLimit == null ? 'Unlimited' : String(billing?.offerLimit || 0);
    const offerUsage = `${billing?.managedOfferCount || 0} / ${offerLimit}`;
    const nearLimit =
      billing?.offerLimit != null &&
      Number(billing?.remainingOfferSlots || 0) <= 2;
    const leadsUsage =
      includedLeadsTotal > 0
        ? `${includedLeadsUsed} / ${includedLeadsTotal}`
        : 'Not set';
    return [
      { label: 'Plan', value: billing?.planDisplayName || 'No plan', tone: 'default' as const },
      { label: 'Offers', value: offerUsage, tone: nearLimit ? ('warning' as const) : ('default' as const) },
      {
        label: 'Visible Leads',
        value: leadsUsage,
        tone: includedLeadsTotal > 0 && includedRemaining === 0 ? ('warning' as const) : ('default' as const),
      },
      {
        label: 'Hidden Leads',
        value: String(hiddenLeadCount),
        tone: hiddenLeadCount > 0 ? ('warning' as const) : ('default' as const),
      },
      {
        label: 'Wallet',
        value: formatCurrency(walletBalance, walletCurrency),
        tone: walletBalance <= 0 && hiddenLeadCount > 0 ? ('danger' as const) : ('default' as const),
      },
    ];
  }, [
    billing?.managedOfferCount,
    billing?.offerLimit,
    billing?.planDisplayName,
    billing?.remainingOfferSlots,
    hiddenLeadCount,
    includedLeadsTotal,
    includedLeadsUsed,
    includedRemaining,
    walletBalance,
    walletCurrency,
  ]);

  const growthSuggestions = useMemo<GrowthSuggestion[]>(() => {
    const items: GrowthSuggestion[] = [];

    if (hiddenLeadCount > 0) {
      items.push({
        id: 'unlock-hidden-leads',
        title: `Unlock ${hiddenLeadCount} hidden leads`,
        description: 'Top up your wallet or upgrade plan to access contact details and convert faster.',
        ctaLabel: 'Fix billing',
        ctaHref: '/vendor/billing',
        tone: 'warning',
      });
    }

    if (missingCompanyCount > 0) {
      items.push({
        id: 'expand-companies',
        title: `Expand to ${missingCompanyCount} more companies`,
        description: 'You are not yet targeting part of the CorpDeals company base.',
        ctaLabel: 'Expand coverage',
        ctaHref: '/vendor/offers',
      });
    }

    const underperforming = offerRows.find((row) => row.leads < 2 && row.isActive);
    if (underperforming) {
      items.push({
        id: 'underperforming-offer',
        title: `${underperforming.offerName} is underperforming`,
        description: 'Refresh messaging or clone it to a better-fit company segment.',
        ctaLabel: 'Edit offer',
        ctaHref: underperforming.editHref,
      });
    }

    if (!billing?.canCreateOffer) {
      items.push({
        id: 'plan-blocked',
        title: 'Offer creation is currently blocked',
        description: billing?.createOfferMessage || 'Resolve billing to add more offers.',
        ctaLabel: 'Review plan',
        ctaHref: '/vendor/billing',
        tone: 'warning',
      });
    }

    if (items.length === 0) {
      items.push({
        id: 'default-growth',
        title: 'Replicate your top offer',
        description: 'Your best-performing offer can be cloned to more companies for faster growth.',
        ctaLabel: 'Open offers',
        ctaHref: '/vendor/offers',
      });
    }

    return items.slice(0, 6);
  }, [
    billing?.canCreateOffer,
    billing?.createOfferMessage,
    hiddenLeadCount,
    missingCompanyCount,
    offerRows,
  ]);

  const vendorStatus = String(profile?.status || user?.vendor?.status || 'APPROVED').toUpperCase();
  const isFreePlan = String(billing?.planDisplayName || '')
    .trim()
    .toUpperCase()
    .includes('FREE');
  const secondaryActionLabel = isFreePlan
    ? hiddenLeadCount > 0
      ? 'Switch to Gold'
      : 'Manage Billing'
    : hiddenLeadCount > 0 || walletBalance <= 0
    ? 'Top Up Wallet'
    : 'Upgrade Plan';

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-44 animate-pulse rounded-3xl bg-slate-200" />
        <div className="h-20 animate-pulse rounded-2xl bg-slate-200" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-28 animate-pulse rounded-2xl bg-slate-200" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-4 sm:space-y-6">
      <VendorDashboardHeader
        companyName={profile?.companyName || user?.vendor?.companyName || 'Vendor program'}
        status={vendorStatus}
        subtitle="Track leads, offers, billing, and growth opportunities."
        primaryHref="/vendor/offers/new"
        primaryLabel="Create Offer"
        secondaryHref="/vendor/billing"
        secondaryLabel={secondaryActionLabel}
      />

      <VendorStickySummaryBar items={summaryBarItems} />

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>
      ) : null}

      <HiddenLeadsAlertCard
        hiddenCount={hiddenLeadCount}
        estimatedValueText={estimatedHiddenLeadValue}
        upgradeHref="/vendor/billing"
        upgradeLabel={isFreePlan ? 'Switch to Gold' : 'Upgrade Plan'}
        showUpgradeAction={isFreePlan ? hiddenLeadCount > 0 : true}
        topUpHref="/vendor/billing"
        viewHref="#hidden-leads"
      />

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <VendorKpiCard
          title="Leads today"
          value={String(summary.leads_today)}
          helper="New incoming lead volume today."
          icon={<VendorDashboardSectionIcon type="kpi" />}
        />
        <VendorKpiCard
          title="Leads this billing cycle"
          value={includedLeadsTotal > 0 ? `${includedLeadsUsed}/${includedLeadsTotal}` : String(summary.leads_month)}
          helper={includedLeadsTotal > 0 ? 'Included lead usage in current cycle.' : 'Using monthly lead metric until cycle data is set.'}
          icon={<VendorDashboardSectionIcon type="kpi" />}
        />
        <VendorKpiCard
          title="Active offers"
          value={String(summary.active_offers)}
          helper="Offers currently visible to employees."
          icon={<VendorDashboardSectionIcon type="coverage" />}
        />
        <VendorKpiCard
          title="Top performing offer"
          value={topPerformingOffer}
          helper="Highest total lead volume."
          icon={<VendorDashboardSectionIcon type="kpi" />}
        />
        <VendorKpiCard
          title="Wallet spend this cycle"
          value={formatCurrency(walletSpendThisCycle, walletCurrency)}
          helper="Lead charges deducted from wallet."
          icon={<VendorDashboardSectionIcon type="wallet" />}
        />
        <VendorKpiCard
          title="Hidden leads waiting"
          value={String(hiddenLeadCount)}
          helper="Leads locked by plan or wallet limits."
          tone={hiddenLeadCount > 0 ? 'warning' : 'default'}
          icon={<VendorDashboardSectionIcon type="hidden" />}
        />
      </section>

      <OfferPerformanceSection
        offers={offerRows}
        createOfferHref="/vendor/offers/new"
      />

      <CompanyCoverageExpansionSection
        targetedCount={targetedCompanyCount}
        totalCount={totalCompanies}
        missingCount={missingCompanyCount}
        estimatedMissedLeads={Number.isFinite(estimatedMissedLeads) ? estimatedMissedLeads : 0}
        suggestedCompanies={suggestedCompanies}
        expandHref="/vendor/offers"
      />

      <div id="hidden-leads">
        <HiddenLeadsSection leads={hiddenLeadTeasers} billingHref="/vendor/billing" />
      </div>

      <BillingWalletSection
        planName={billing?.planDisplayName || 'No plan'}
        walletBalanceText={formatCurrency(walletBalance, walletCurrency)}
        includedRemainingText={
          includedLeadsTotal > 0
            ? `${includedRemaining} remaining`
            : 'No included lead quota set'
        }
        chargesThisCycleText={formatCurrency(walletSpendThisCycle, walletCurrency)}
        transactions={walletTransactions}
        onTopUp={handleQuickTopUp}
        isToppingUp={isToppingUp}
        manageBillingHref="/vendor/billing"
      />

      <GrowthSuggestionsSection suggestions={growthSuggestions} />

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-900">Quick export</p>
            <p className="text-sm text-slate-600">Download lead data for external analysis or demos.</p>
          </div>
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={isExporting}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60"
          >
            <FileDown className="h-4 w-4" />
            {isExporting ? 'Exporting...' : 'Export Leads CSV'}
          </button>
        </div>
      </section>

      <section className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-xs text-slate-600">
        <p className="font-semibold text-slate-700">Data notes</p>
        <p className="mt-1">
          Hidden lead teaser category currently falls back to offer product metadata where category is not available in
          the vendor leads API response.
        </p>
      </section>
    </div>
  );
}
