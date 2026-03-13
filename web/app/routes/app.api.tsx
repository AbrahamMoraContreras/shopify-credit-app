
import { UUID } from 'crypto';
import { useEffect, useState } from 'react';

// Types that match your `credits` table / API response
interface Credit {
  customer_id: number;
  concept: string;
  total_amount: number;
  balance: number;
  status: string;
  merchant_id: UUID;
  invoice_code: string;
  installments_count: number;
  created_at: string; // ISO datetime from API
  updated_at: string; // ISO datetime from API
  customer_name: string;
  customer_document_id: string;
  customer_extra: string | null;
}

export default function CreditsListPage() {
  const [credits, setCredits] = useState<Credit[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadCredits() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch('http://localhost:8000/api/credits');
        if (!response.ok) {
          throw new Error(`Error cargando créditos: ${response.status}`);
        }

        const data: Credit[] = await response.json();
        setCredits(data);
      } catch (err: unknown) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('Error desconocido al cargar créditos');
        }
      } finally {
        setLoading(false);
      }
    }

    void loadCredits();
  }, []);

  return (
    <s-page heading="Créditos">
      <s-section padding="base">
        {loading && (
          <s-text>Cargando créditos...</s-text>
        )}

        {error && (
          <s-text tone="critical">{error}</s-text>
        )}

        {!loading && !error && credits.length === 0 && (
          <s-text color="subdued">No hay créditos registrados.</s-text>
        )}

        {!loading && !error && credits.length > 0 && (
          <s-stack direction="block" gap="base">
            {credits.map((credit) => (
              <s-section
                key={credit.customer_id}
                heading={credit.customer_name || 'Cliente sin nombre'}
              >
                <s-text>
                  Nombre: {credit.customer_name}<br />
                </s-text>
                <s-text>
                  Customer Document: {credit.customer_document_id}<br />
                </s-text>
                <s-text>
                  Merchant ID: {credit.merchant_id}<br />
                </s-text>
                <s-text>
                  Balance: {credit.balance}<br />
                </s-text>
                <s-text>
                  Concepto: {credit.concept}<br />
                </s-text>
                <s-text>
                  Invoice Code: {credit.invoice_code}<br />
                </s-text>
                <s-text>
                  Monto total: {credit.total_amount.toFixed(2)}<br />
                </s-text>
                <s-text>
                  Saldo: {credit.balance.toFixed(2)}<br />
                </s-text>
                <s-text>
                  Número de cuotas: {credit.installments_count}<br />
                </s-text>
                <s-text>
                  Estado: {credit.status}<br />
                </s-text>
                <s-text color="subdued">
                  Creado: {new Date(credit.created_at).toLocaleString()}<br />
                </s-text>
              </s-section>
            ))}
          </s-stack>
        )}
      </s-section>
    </s-page>
  );
}