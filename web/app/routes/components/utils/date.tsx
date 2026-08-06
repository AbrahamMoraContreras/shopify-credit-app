// utils/date.ts
// Debe coincidir con backend/src/crud/credit.py → _generate_installments

export function addDays(baseDateISO: string, days: number): string {
  // Parsing as YYYY-MM-DD manually avoids UTC/timezone shifts
  const [year, month, day] = baseDateISO.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  if (Number.isNaN(date.getTime())) return baseDateISO;
  date.setDate(date.getDate() + days);

  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function addMonths(baseDateISO: string, months: number): string {
  const [year, month, day] = baseDateISO.split("-").map(Number);
  if (!year || !month || !day) return baseDateISO;

  // Igual que el backend: conservar el día original; si el mes no lo tiene, último día.
  let targetYear = year;
  let targetMonth = month + months; // 1-based month arithmetic
  targetYear += Math.floor((targetMonth - 1) / 12);
  targetMonth = ((targetMonth - 1) % 12) + 1;
  if (targetMonth <= 0) {
    targetMonth += 12;
    targetYear -= 1;
  }

  const lastDay = new Date(targetYear, targetMonth, 0).getDate();
  const targetDay = Math.min(day, lastDay);

  const m = String(targetMonth).padStart(2, "0");
  const d = String(targetDay).padStart(2, "0");
  return `${targetYear}-${m}-${d}`;
}

/**
 * Calendario preliminar de cuotas.
 * Cuota 1 = first_due_date (startDateISO); luego +15 días o +1 mes.
 * Alineado con `_generate_installments` del backend.
 */
export function generateInstallmentSchedule(
  startDateISO: string,
  frequency: "quincenal" | "mensual",
  installmentNumber: number,
): string[] {
  if (!startDateISO || installmentNumber <= 0) return [];

  const dates: string[] = [];

  for (let i = 0; i < installmentNumber; i += 1) {
    if (i === 0) {
      dates.push(startDateISO);
      continue;
    }
    dates.push(
      frequency === "quincenal"
        ? addDays(startDateISO, 15 * i)
        : addMonths(startDateISO, i),
    );
  }

  return dates;
}

/** Formato legible local (sin shift UTC) para YYYY-MM-DD. */
export function formatScheduleDate(isoDate: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return isoDate;
  const [y, m, d] = isoDate.split("-").map(Number);
  const date = new Date(y, m - 1, d, 12, 0, 0);
  return date.toLocaleDateString("es-VE");
}
