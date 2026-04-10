import { getVendorBillingState } from './vendor-billing';

export type VendorBillingAccessAction = 'CREATE_OFFER' | 'SUBMIT_OFFER' | 'PUBLISH_OFFER';

export type VendorBillingAccessReasonCode =
  | 'OK'
  | 'VENDOR_PLAN_REQUIRED'
  | 'VENDOR_BILLING_BLOCKED'
  | 'VENDOR_PLAN_LIMIT_REACHED';

type VendorBillingStateSnapshot = Awaited<ReturnType<typeof getVendorBillingState>>;

export type VendorBillingAccessResult = {
  allowed: boolean;
  action: VendorBillingAccessAction;
  reasonCode: VendorBillingAccessReasonCode;
  message: string;
  billingAssociationStatus: string | null;
  planStatus: string;
  planName: string;
  hasActivePlan: boolean;
  currentOfferCount: number;
  maxAllowedOffers: number | null;
  remainingOfferSlots: number | null;
  hasAllowedAssociationStatus: boolean;
};

const publishActionSet: VendorBillingAccessAction[] = ['SUBMIT_OFFER', 'PUBLISH_OFFER'];

const inferNoPlanMessage = (state: VendorBillingStateSnapshot, action: VendorBillingAccessAction) => {
  if (action === 'CREATE_OFFER') {
    return state.createOfferMessage || 'An active billing plan is required before creating offers.';
  }
  return (
    state.publishOfferMessage ||
    'An active billing plan is required before submitting or publishing offers.'
  );
};

const inferBillingBlockedMessage = (state: VendorBillingStateSnapshot, action: VendorBillingAccessAction) => {
  if (action === 'CREATE_OFFER') {
    return state.createOfferMessage || 'Your billing account is blocked. Update billing to continue.';
  }
  return state.publishOfferMessage || 'Your billing account is blocked. Update billing to continue.';
};

export const evaluateVendorBillingAccessFromState = (
  state: VendorBillingStateSnapshot,
  action: VendorBillingAccessAction
): VendorBillingAccessResult => {
  const hasActivePlan = Boolean(state.activePlan);
  const hasAllowedAssociationStatus = Boolean(state.hasAllowedAssociationStatus);
  const hasCapacity =
    state.remainingOfferSlots === null || (state.remainingOfferSlots ?? 0) > 0;

  if (!hasAllowedAssociationStatus) {
    return {
      allowed: false,
      action,
      reasonCode: 'VENDOR_BILLING_BLOCKED',
      message: inferBillingBlockedMessage(state, action),
      billingAssociationStatus: state.associationStatus,
      planStatus: String(state.planStatus || 'NONE'),
      planName: String(state.planDisplayName || 'No plan'),
      hasActivePlan,
      currentOfferCount: Number(state.managedOfferCount || 0),
      maxAllowedOffers: state.offerLimit,
      remainingOfferSlots: state.remainingOfferSlots,
      hasAllowedAssociationStatus,
    };
  }

  if (!hasActivePlan) {
    return {
      allowed: false,
      action,
      reasonCode: 'VENDOR_PLAN_REQUIRED',
      message: inferNoPlanMessage(state, action),
      billingAssociationStatus: state.associationStatus,
      planStatus: String(state.planStatus || 'NONE'),
      planName: String(state.planDisplayName || 'No plan'),
      hasActivePlan,
      currentOfferCount: Number(state.managedOfferCount || 0),
      maxAllowedOffers: state.offerLimit,
      remainingOfferSlots: state.remainingOfferSlots,
      hasAllowedAssociationStatus,
    };
  }

  if ((action === 'CREATE_OFFER' || publishActionSet.includes(action)) && !hasCapacity) {
    return {
      allowed: false,
      action,
      reasonCode: 'VENDOR_PLAN_LIMIT_REACHED',
      message:
        state.createOfferMessage ||
        'Your current billing plan limit has been reached. Upgrade plan or free an offer slot.',
      billingAssociationStatus: state.associationStatus,
      planStatus: String(state.planStatus || 'NONE'),
      planName: String(state.planDisplayName || 'No plan'),
      hasActivePlan,
      currentOfferCount: Number(state.managedOfferCount || 0),
      maxAllowedOffers: state.offerLimit,
      remainingOfferSlots: state.remainingOfferSlots,
      hasAllowedAssociationStatus,
    };
  }

  return {
    allowed: true,
    action,
    reasonCode: 'OK',
    message: '',
    billingAssociationStatus: state.associationStatus,
    planStatus: String(state.planStatus || 'NONE'),
    planName: String(state.planDisplayName || 'No plan'),
    hasActivePlan,
    currentOfferCount: Number(state.managedOfferCount || 0),
    maxAllowedOffers: state.offerLimit,
    remainingOfferSlots: state.remainingOfferSlots,
    hasAllowedAssociationStatus,
  };
};

export const getVendorBillingAccess = async (
  vendorId: string,
  action: VendorBillingAccessAction,
  options?: { excludeOfferId?: string | null }
): Promise<VendorBillingAccessResult> => {
  const state = await getVendorBillingState(vendorId, options);
  return evaluateVendorBillingAccessFromState(state, action);
};

export const canVendorCreateOffer = async (
  vendorId: string,
  options?: { excludeOfferId?: string | null }
) => getVendorBillingAccess(vendorId, 'CREATE_OFFER', options);

export const canVendorSubmitOffer = async (
  vendorId: string,
  options?: { excludeOfferId?: string | null }
) => getVendorBillingAccess(vendorId, 'SUBMIT_OFFER', options);

export const canVendorPublishOffer = async (
  vendorId: string,
  options?: { excludeOfferId?: string | null }
) => getVendorBillingAccess(vendorId, 'PUBLISH_OFFER', options);

export const toBillingAccessDeniedResponse = (access: VendorBillingAccessResult) => ({
  error: 'BILLING_ENFORCEMENT_FAILED',
  code: access.reasonCode,
  detail: access.message,
  billing: {
    associationStatus: access.billingAssociationStatus,
    planStatus: access.planStatus,
    planName: access.planName,
    currentOfferCount: access.currentOfferCount,
    maxAllowedOffers: access.maxAllowedOffers,
    remainingOfferSlots: access.remainingOfferSlots,
    hasActivePlan: access.hasActivePlan,
  },
});

export const canApplyAdminBillingOverride = (input: {
  requested: boolean;
  reason: string;
}) => input.requested && input.reason.trim().length >= 8;
