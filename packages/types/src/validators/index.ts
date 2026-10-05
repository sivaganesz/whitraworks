import { z } from 'zod';

export const RESERVED_SLUGS = [
  'admin',
  'api',
  'app',
  'assets',
  'auth',
  'billing',
  'cdn',
  'dashboard',
  'dev',
  'docs',
  'health',
  'login',
  'ops',
  'public',
  'root',
  'static',
  'status',
  'support',
  'system',
  'test',
  'whitraworks',
  'www',
] as const;

export const slugSchema = z
  .string()
  .min(3, 'Slug must be at least 3 characters long')
  .max(30, 'Slug must not exceed 30 characters')
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must consist only of lowercase alphanumeric characters and single hyphens')
  .refine((slug) => !RESERVED_SLUGS.includes(slug as any), {
    message: 'This subdomain slug is reserved for platform infrastructure',
  });

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters long')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

export const registerSchema = z.object({
  email: z.string().email('Please provide a valid email address').toLowerCase().trim(),
  password: passwordSchema,
  firstName: z.string().min(1, 'First name is required').trim(),
  lastName: z.string().min(1, 'Last name is required').trim(),
  workspaceName: z.string().min(2, 'Workspace name must be at least 2 characters').trim(),
  workspaceSlug: slugSchema,
});

export type RegisterDto = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().email('Please provide a valid email address').toLowerCase().trim(),
  password: z.string().min(1, 'Password is required'),
});

export type LoginDto = z.infer<typeof loginSchema>;

export const inviteMemberSchema = z.object({
  email: z.string().email('Please provide a valid email address').toLowerCase().trim(),
  roleId: z.string().min(1, 'Role ID is required'),
});

export type InviteMemberDto = z.infer<typeof inviteMemberSchema>;

export const updateTenantSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').trim().optional(),
  currency: z.string().length(3, 'Currency must be a 3-letter code (e.g. INR, USD)').optional(),
  timezone: z.string().min(1, 'Timezone is required').optional(),
  logoUrl: z.string().url('Invalid URL format').nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type UpdateTenantDto = z.infer<typeof updateTenantSchema>;

export const updateMemberRoleSchema = z.object({
  roleId: z.string().min(1, 'Role ID is required'),
  status: z.enum(['ACTIVE', 'SUSPENDED']).optional(),
});

export type UpdateMemberRoleDto = z.infer<typeof updateMemberRoleSchema>;

export const checkSlugSchema = z.object({
  slug: z.string().trim().toLowerCase(),
});

export type CheckSlugDto = z.infer<typeof checkSlugSchema>;
