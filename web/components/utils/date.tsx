// utils/date.ts

export function addDays(baseDateISO: string, days: number): string {
  // Parsing as YYYY-MM-DD manually avoids UTC/timezone shifts
  const [year, month, day] = baseDateISO.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  
  if (Number.isNaN(date.getTime())) return baseDateISO;
  date.setDate(date.getDate() + days);
  
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function addMonths(baseDateISO: string, months: number): string {
  const [year, month, day] = baseDateISO.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  
  if (Number.isNaN(date.getTime())) return baseDateISO;

  const dayOfMonth = date.getDate();
  date.setMonth(date.getMonth() + months);

  // If the new month has fewer days, set to last day of the month
  if (date.getDate() < dayOfMonth) {
    date.setDate(0);
  }

  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function generateInstallmentSchedule(
  startDateISO: string,
  frequency: 'quincenal' | 'mensual',
  installmentNumber: number,
): string[] {
  if (!startDateISO || installmentNumber <= 0) return [];

  const dates: string[] = [];

  for (let i = 1; i <= installmentNumber; i += 1) {
    dates.push(
      frequency === 'quincenal'
        ? addDays(startDateISO, 15 * i)
        : addMonths(startDateISO, i),
    );
  }

  return dates;
}
