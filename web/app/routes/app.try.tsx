import { useState, useMemo } from 'react';

interface Credit {
  customer_id: number;
  concept: string;
  total_amount: number;
  balance: number;
  status: string;
  merchant_id: string; // UUID as string from API
  invoice_code: string;
  installments_count: number;
  created_at: string; // ISO datetime from API
  updated_at: string; // ISO datetime from API
  customer_name: string;
  customer_document_id: string;
  customer_extra: string | null;
}

interface Props {
  credits: Credit[];
}

export default function CustomerSummaryFromCredits({ credits = [] }: Props) {
  const [form, setForm] = useState<{ customer: string }>({ customer: '' });

  // 1) Find the selected credit based on the selected customer value
  const selectedCredit = useMemo(() => {
    if (!form.customer) return undefined;

    // Option 1: use customer_id as select value
    const id = Number(form.customer);
    if (!Number.isNaN(id)) {
      return credits.find((c) => c.customer_id === id);
    }

    // Fallback: match by invoice_code or something else if needed
    return credits.find((c) => c.invoice_code === form.customer);
  }, [form.customer, credits]);

  // 2) Build the multi-line description dynamically from the selected credit
  const description = useMemo(() => {
    if (!selectedCredit) {
      return 'Seleccione un cliente para ver más detalles.';
    }

    // These are placeholders — replace with your real stats logic if you have it
    const totalCredits = selectedCredit.installments_count; // or derive from data
    const completedCredits = 0; // TODO: reemplazar con lógica real
    const activeCredits = 0; // TODO: reemplazar con lógica real
    const overdueCredits = 0; // TODO: reemplazar con lógica real
    const reputation = 'Desconocida'; // TODO: lógica de reputación

    return (
      selectedCredit.customer_name + '.\n' +
      `Créditos Totales: ${totalCredits}.\n` +
      `Créditos Completados: ${completedCredits}.\n` +
      `Créditos Activos: ${activeCredits}.\n` +
      `Créditos Morosos: ${overdueCredits}.\n` +
      `Reputación crediticia: ${reputation}`
    );
  }, [selectedCredit]);

  const descriptionLines = description.split('\n');

  return (
    <s-page heading="Créditos por cliente">
      <s-section padding="base">
        {/* SELECT de cliente basado en credits */}
        <s-select
          label="Cliente"
          details="Seleccione nombre del cliente"
          value={form.customer}
          onChange={(event: Event) => {
            const target = event.currentTarget as HTMLSelectElement | null;
            const raw = target?.value ?? '';

            setForm((prev) => ({
              ...prev,
              customer: raw,
            }));
          }}
        >
          <s-option value="">Seleccione un cliente</s-option>
          {credits.map((credit) => (
            <s-option
              key={credit.customer_id}
              value={String(credit.customer_id)}
            >
              {credit.customer_name} ({credit.customer_document_id})
            </s-option>
          ))}
        </s-select>

        {/* Resumen dinámico del cliente */}
        <s-section heading="Resumen del cliente">
          <s-box>
            <s-text tone="info">
              {descriptionLines.map((line, index) => (
                <span key={index}>
                  {line}
                  {index < descriptionLines.length - 1 && <br />}
                </span>
              ))}
            </s-text>
          </s-box>
        </s-section>
      </s-section>
    </s-page>
  );
}