type DeleteSafetyInput = {
  isSubcategory: boolean;
  childCount: number;
  offerCount: number;
  leadEventCount: number;
};

export type DeleteSafetyResult =
  | { canDelete: true }
  | {
      canDelete: false;
      code: 'CATEGORY_HAS_SUBCATEGORIES' | 'CATEGORY_HAS_OFFERS' | 'CATEGORY_HAS_LEAD_EVENTS';
      message: string;
    };

export const slugifyCategoryName = (value: string) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');

export const getCategoryDeleteSafety = (input: DeleteSafetyInput): DeleteSafetyResult => {
  const childCount = Math.max(0, Number(input.childCount || 0));
  const offerCount = Math.max(0, Number(input.offerCount || 0));
  const leadEventCount = Math.max(0, Number(input.leadEventCount || 0));

  if (!input.isSubcategory && childCount > 0) {
    return {
      canDelete: false,
      code: 'CATEGORY_HAS_SUBCATEGORIES',
      message: 'Category has subcategories. Deactivate it instead of deleting.',
    };
  }

  if (offerCount > 0) {
    return {
      canDelete: false,
      code: 'CATEGORY_HAS_OFFERS',
      message: input.isSubcategory
        ? 'Subcategory has linked offers. Deactivate it instead of deleting.'
        : 'Category has linked offers. Deactivate it instead of deleting.',
    };
  }

  if (leadEventCount > 0) {
    return {
      canDelete: false,
      code: 'CATEGORY_HAS_LEAD_EVENTS',
      message: input.isSubcategory
        ? 'Subcategory has lead history. Deactivate it instead of deleting.'
        : 'Category has lead history. Deactivate it instead of deleting.',
    };
  }

  return { canDelete: true };
};
