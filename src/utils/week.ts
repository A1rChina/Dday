export type IsoWeek = {
  year: number;
  week: number;
  week_start: string;
  week_end: string;
};

const DAY_MS = 24 * 60 * 60 * 1000;

export function isoWeekFromDate(dateText: string): IsoWeek {
  const date = parseDateUtc(dateText);
  const day = date.getUTCDay() || 7;
  const thursday = new Date(date.getTime() + (4 - day) * DAY_MS);
  const year = thursday.getUTCFullYear();
  const yearStart = new Date(Date.UTC(year, 0, 1));
  const week = Math.ceil(((thursday.getTime() - yearStart.getTime()) / DAY_MS + 1) / 7);
  const monday = new Date(date.getTime() - (day - 1) * DAY_MS);
  const sunday = new Date(monday.getTime() + 6 * DAY_MS);

  return {
    year,
    week,
    week_start: formatDateUtc(monday),
    week_end: formatDateUtc(sunday),
  };
}

export function isoWeekRange(year: number, week: number): IsoWeek {
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    throw new Error('year must be between 2000 and 2100');
  }
  if (!Number.isInteger(week) || week < 1 || week > 53) {
    throw new Error('week must be between 1 and 53');
  }

  const jan4 = new Date(Date.UTC(year, 0, 4));
  const jan4Day = jan4.getUTCDay() || 7;
  const firstMonday = new Date(jan4.getTime() - (jan4Day - 1) * DAY_MS);
  const monday = new Date(firstMonday.getTime() + (week - 1) * 7 * DAY_MS);
  const sunday = new Date(monday.getTime() + 6 * DAY_MS);
  const resolved = isoWeekFromDate(formatDateUtc(monday));

  if (resolved.year !== year || resolved.week !== week) {
    throw new Error(`ISO week ${year}-W${week.toString().padStart(2, '0')} does not exist`);
  }

  return {
    year,
    week,
    week_start: formatDateUtc(monday),
    week_end: formatDateUtc(sunday),
  };
}

export function isDateInIsoWeek(dateText: string, week: IsoWeek): boolean {
  return dateText >= week.week_start && dateText <= week.week_end;
}

export function formatWeekLabel(year: number, week: number): string {
  return `${year}-W${week.toString().padStart(2, '0')}`;
}

function parseDateUtc(dateText: string): Date {
  const match = dateText.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) throw new Error('date must be YYYY-MM-DD');

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new Error('date is invalid');
  }

  return date;
}

function formatDateUtc(date: Date): string {
  return date.toISOString().slice(0, 10);
}
