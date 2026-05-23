export function todayInTimezone(timeZone = 'Asia/Shanghai'): string {
  // en-CA outputs YYYY-MM-DD in modern runtimes.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function normalizeDate(input: string | undefined, timeZone = 'Asia/Shanghai'): string {
  if (!input) return todayInTimezone(timeZone);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input)) {
    throw new Error('date must be YYYY-MM-DD');
  }
  return input;
}

export function normalizePlanDate(input: string): string {
  const value = input.trim();
  if (!value) throw new Error('生产日期不能为空');

  const exact = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (exact) return assertValidDate(Number(exact[1]), Number(exact[2]), Number(exact[3]));

  const loose = value.match(/^(\d{4})[/.年-](\d{1,2})[/.月-](\d{1,2})日?$/);
  if (loose) return assertValidDate(Number(loose[1]), Number(loose[2]), Number(loose[3]));

  if (/^\d{5}(\.\d+)?$/.test(value)) {
    const days = Math.floor(Number(value));
    const date = new Date(Date.UTC(1899, 11, 30) + days * 24 * 60 * 60 * 1000);
    return date.toISOString().slice(0, 10);
  }

  throw new Error('生产日期格式应为 YYYY-MM-DD 或 YYYY/M/D');
}

function assertValidDate(year: number, month: number, day: number): string {
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new Error('生产日期不是有效日期');
  }

  return `${year.toString().padStart(4, '0')}-${month.toString().padStart(2, '0')}-${day
    .toString()
    .padStart(2, '0')}`;
}
