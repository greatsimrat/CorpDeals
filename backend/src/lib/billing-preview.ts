export const BILLING_GST_RATE = 0.05;

const roundMoney = (value: number) => Math.round(value * 100) / 100;

export const resolveLeadUsageForCycle = (input: {
  uniqueValidLeadCount: number;
  includedFreeLeads: number;
}) => {
  const uniqueValidLeadCount = Math.max(0, Math.trunc(Number(input.uniqueValidLeadCount) || 0));
  const includedFreeLeads = Math.max(0, Math.trunc(Number(input.includedFreeLeads) || 0));
  const freeLeadsUsed = Math.min(uniqueValidLeadCount, includedFreeLeads);
  const paidLeadCount = Math.max(uniqueValidLeadCount - includedFreeLeads, 0);
  return { freeLeadsUsed, paidLeadCount };
};

export const calculateBillingPreviewTotals = (input: {
  monthlySubscriptionAmount: number;
  paidLeadCharges: number;
  gstRate?: number;
}) => {
  const gstRate = Number.isFinite(input.gstRate) ? Number(input.gstRate) : BILLING_GST_RATE;
  const monthlySubscriptionAmount = roundMoney(Math.max(0, Number(input.monthlySubscriptionAmount) || 0));
  const paidLeadCharges = roundMoney(Math.max(0, Number(input.paidLeadCharges) || 0));
  const subtotal = roundMoney(monthlySubscriptionAmount + paidLeadCharges);
  const gstAmount = roundMoney(subtotal * gstRate);
  const estimatedTotal = roundMoney(subtotal + gstAmount);
  return {
    monthlySubscriptionAmount,
    paidLeadCharges,
    subtotal,
    gstRate,
    gstAmount,
    estimatedTotal,
  };
};

