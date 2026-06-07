import { createTraceId } from '@enterprise/shared-utils';

export const ok = <T>(data: T) => ({
  success: true,
  data,
  traceId: createTraceId(),
});
