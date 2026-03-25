// utils/number.ts

//Método para convertir strings --> numbers. Don't touch...

export function toNumber(
  value: string | number | null | undefined,
  defaultValue = 0,
): number {
  if (value === null || value === undefined) return defaultValue;
  if (typeof value === 'number') {
    return Number.isNaN(value) ? defaultValue : value;
  }

  const trimmed = value.trim();
  if (trimmed === '') return defaultValue;

  const parsed = Number(trimmed);
  return Number.isNaN(parsed) ? defaultValue : parsed;
}

export function calculateInstallmentAmount(
  totalCreditAmount: number,
  installmentNumber: number,
): number {
  if (!totalCreditAmount || !installmentNumber) return 0;
  return Number((totalCreditAmount / installmentNumber).toFixed(2));
}
