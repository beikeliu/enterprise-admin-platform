export const createTraceId = () =>
  `trace_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;

export const compactObject = <T extends Record<string, unknown>>(value: T) =>
  Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined && item !== ''));

export const exhaustive = (value: never): never => {
  throw new Error(`Unhandled case: ${String(value)}`);
};
