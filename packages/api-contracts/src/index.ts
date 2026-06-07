import { z } from 'zod';

export const LoginRequestSchema = z.object({
  username: z.string().min(2),
  password: z.string().min(6),
});

export const UserSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  username: z.string(),
  displayName: z.string(),
  email: z.string().email().nullable(),
  phone: z.string().nullable(),
  status: z.enum(['active', 'disabled']),
  roles: z.array(z.string()),
  permissions: z.array(z.string()),
});

export const AuthSessionSchema = z.object({
  accessToken: z.string(),
  user: UserSchema,
  menus: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      path: z.string(),
      icon: z.string().optional(),
      permission: z.string().optional(),
      children: z.array(z.any()).optional(),
    }),
  ),
});

export const PageQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(20),
  keyword: z.string().optional(),
});

export const TicketSchema = z.object({
  id: z.string(),
  title: z.string(),
  type: z.string(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  status: z.enum(['draft', 'submitted', 'approving', 'approved', 'rejected', 'cancelled', 'closed']),
  applicantId: z.string(),
  applicantName: z.string(),
  departmentName: z.string().nullable(),
  description: z.string().nullable(),
  formData: z.record(z.unknown()),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const CreateTicketSchema = z.object({
  title: z.string().min(2).max(256),
  type: z.string().min(1),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  description: z.string().max(4000).optional(),
  formData: z.record(z.unknown()).default({}),
});

export const ReviewTicketSchema = z.object({
  comment: z.string().max(1000).optional(),
});

export type LoginRequest = z.infer<typeof LoginRequestSchema>;
export type AuthSession = z.infer<typeof AuthSessionSchema>;
export type CurrentUser = z.infer<typeof UserSchema>;
export type Ticket = z.infer<typeof TicketSchema>;
export type CreateTicketInput = z.infer<typeof CreateTicketSchema>;
export type ReviewTicketInput = z.infer<typeof ReviewTicketSchema>;
