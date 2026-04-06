import { z } from 'zod';

const PERSONAL_EMAIL_DOMAINS = new Set([
  'gmail.com',
  'yahoo.com',
  'hotmail.com',
  'outlook.com',
  'live.com',
  'icloud.com',
  'aol.com',
  'proton.me',
  'protonmail.com',
  'pm.me',
  'gmx.com',
]);

export const VENDOR_CATEGORIES = [
  'Telecom',
  'Fitness & Wellness',
  'Education & Tutoring',
  'Travel',
  'Finance & Insurance',
  'Automotive',
  'Food & Beverage',
  'Family & Kids',
  'Local Services',
  'Other',
] as const;

export const normalizeEmail = (value: string) => value.trim().toLowerCase();

export const normalizePhone = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return '';
  const hasPlusPrefix = trimmed.startsWith('+');
  const digitsOnly = trimmed.replace(/\D/g, '');
  return digitsOnly ? `${hasPlusPrefix ? '+' : ''}${digitsOnly}` : '';
};

const isBusinessEmail = (value: string) => {
  const domain = value.split('@')[1]?.toLowerCase() || '';
  return !!domain && !PERSONAL_EMAIL_DOMAINS.has(domain);
};

const requiredUrlSchema = z
  .string()
  .trim()
  .min(1, 'Website is required')
  .max(200, 'Website must be 200 characters or less')
  .refine((value) => {
    try {
      const parsed = new URL(value);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  }, 'Enter a valid website URL');

const requiredPhoneSchema = z
  .string()
  .trim()
  .min(1, 'Phone is required')
  .max(30, 'Phone number must be 30 characters or less')
  .transform((value) => normalizePhone(value))
  .refine((value) => /^\+?\d{10,15}$/.test(value), 'Enter a valid phone number');

export const vendorApplicationSchema = z
  .object({
    businessName: z.string().trim().min(2, 'Business name is required').max(100, 'Business name is too long'),
    contactName: z.string().trim().min(2, 'Contact name is required').max(80, 'Contact name is too long'),
    contactEmail: z
      .string()
      .trim()
      .email('Enter a valid account email')
      .max(120, 'Account email is too long')
      .transform(normalizeEmail),
    businessEmail: z
      .string()
      .trim()
      .email('Enter a valid work email')
      .max(120, 'Work email is too long')
      .transform(normalizeEmail)
      .refine(isBusinessEmail, 'Use your business email address'),
    phone: requiredPhoneSchema,
    website: requiredUrlSchema,
    category: z.enum(VENDOR_CATEGORIES, {
      errorMap: () => ({ message: 'Select a category' }),
    }),
    categoryOther: z
      .string()
      .trim()
      .max(80, 'Category detail must be 80 characters or less')
      .optional()
      .transform((value) => value || ''),
    city: z.string().trim().min(2, 'City or region is required').max(100, 'City is too long'),
    notes: z.string().trim().max(1000, 'Notes must be 1000 characters or less').optional().transform((value) => value || ''),
    jobTitle: z.string().trim().min(2, 'Job title is required').max(80, 'Job title is too long'),
    targetCompanies: z
      .string()
      .trim()
      .max(200, 'Target companies must be 200 characters or less')
      .optional()
      .transform((value) => value || ''),
  })
  .superRefine((data, ctx) => {
    if (data.category === 'Other' && !data.categoryOther.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['categoryOther'],
        message: 'Please specify your category',
      });
    }
  });

export type VendorApplicationInput = z.infer<typeof vendorApplicationSchema>;
