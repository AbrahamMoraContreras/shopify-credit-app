/**
 * Etiquetas en español para métodos de pago (códigos internos del backend).
 */
const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: "Efectivo USD",
  EFECTIVO: "Efectivo VEF",
  BANK: "Transferencia Bancaria",
  PAGO_MOVIL: "Pago Móvil",
  BINANCE: "Binance",
  ZELLE: "Zelle",
  ZINLI: "Zinli",
  DEBITO: "Débito",
  PAYPAL: "PayPal",
  "Saldo a Favor": "Saldo a Favor",
  // Variantes / labels de UI que a veces llegan al backend o a reportes
  Transferencia: "Transferencia Bancaria",
  TRANSFERENCIA: "Transferencia Bancaria",
  "Pago movil": "Pago Móvil",
  "Pago Móvil": "Pago Móvil",
  "Dolares en efectivo": "Efectivo USD",
  "Bolivares en efectivo": "Efectivo VEF",
};

export function formatPaymentMethodLabel(
  method: string | null | undefined,
): string {
  if (!method) return "N/A";
  const key = String(method).trim();
  if (PAYMENT_METHOD_LABELS[key]) return PAYMENT_METHOD_LABELS[key];
  const upper = key.toUpperCase();
  if (PAYMENT_METHOD_LABELS[upper]) return PAYMENT_METHOD_LABELS[upper];
  return key;
}

/**
 * Nombre de entidad bancaria usada en la operación (origen del cliente).
 */
export function formatBankEntityLabel(
  bankName: string | null | undefined,
  fallback?: string | null,
): string {
  const name = (bankName || fallback || "").trim();
  return name || "N/A";
}

/** Periodicidad del crédito (no confundir con método de cobro). */
export function formatCreditFrequencyLabel(
  frequency: string | null | undefined,
): string {
  if (!frequency) return "N/A";
  const map: Record<string, string> = {
    quincenal: "Quincenal",
    mensual: "Mensual",
    fiado: "Fiado",
  };
  const key = String(frequency).trim().toLowerCase();
  return map[key] || frequency;
}

/**
 * Notas de cobro legibles: tags internos → texto para el merchant.
 */
export function formatPaymentNotes(
  notes: string | null | undefined,
): string {
  if (!notes) return "—";
  let cleaned = notes.replace(
    /\[DISTRIBUTE_EXCESS\]/gi,
    "Distribución de Excedente",
  );
  cleaned = cleaned.replace(
    /\[OVERPAYMENT:\s*([\d.]+)\]/gi,
    (_m, amount: string) => `Excedente a saldo a favor: $${amount}`,
  );
  cleaned = cleaned.replace(
    /Doc:\s*[^\|]+\|\s*Teléf:\s*[^\|]+\|\s*Extra:\s*.*/gi,
    "",
  );
  return cleaned.trim() || "—";
}
