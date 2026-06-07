export type ID = string;

export type TenantScoped = {
  tenantId: ID;
};

export type AuditFields = {
  createdAt: string;
  updatedAt: string;
  createdBy?: ID;
  updatedBy?: ID;
};

export type PageQuery = {
  page?: number;
  pageSize?: number;
  keyword?: string;
};

export type PageResult<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
};

export type ApiError = {
  code: string;
  message: string;
  details?: unknown;
};

export type ApiResponse<T> = {
  success: boolean;
  data: T;
  error?: ApiError;
  traceId: string;
};

export type UserStatus = 'active' | 'disabled';
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TicketStatus =
  | 'draft'
  | 'submitted'
  | 'approving'
  | 'approved'
  | 'rejected'
  | 'cancelled'
  | 'closed';

export type WorkflowTaskStatus = 'pending' | 'approved' | 'rejected' | 'transferred' | 'cancelled';
