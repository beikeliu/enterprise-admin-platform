const dateTimeFormatter = new Intl.DateTimeFormat('zh-CN', {
  timeZone: 'Asia/Shanghai',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
});

const dateFormatter = new Intl.DateTimeFormat('zh-CN', {
  timeZone: 'Asia/Shanghai',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const isoDateTimePattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;

export function formatChinaDateTime(value: string) {
  if (!isoDateTimePattern.test(value)) return value;
  return formatParts(dateTimeFormatter, new Date(value), true);
}

export function getChinaDateKey(value = new Date()) {
  return formatParts(dateFormatter, value, false);
}

export function normalizeApiDates<T>(value: T): T {
  if (Array.isArray(value)) return value.map((item) => normalizeApiDates(item)) as T;
  if (!value || typeof value !== 'object') return value;
  const normalized = Object.fromEntries(
    Object.entries(value).map(([key, entry]) => {
      if (typeof entry === 'string' && /(At|Time)$/.test(key)) {
        return [key, formatChinaDateTime(entry)];
      }
      return [key, normalizeApiDates(entry)];
    }),
  );
  return normalized as T;
}

function formatParts(formatter: Intl.DateTimeFormat, date: Date, includeTime: boolean) {
  const parts = Object.fromEntries(formatter.formatToParts(date).map((part) => [part.type, part.value]));
  const datePart = `${parts.year}-${parts.month}-${parts.day}`;
  if (!includeTime) return datePart;
  return `${datePart} ${parts.hour}:${parts.minute}:${parts.second}`;
}
