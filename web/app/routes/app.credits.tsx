//app.credits.tsx
'use client'

import { Credit } from "web/app/types/credit";
import { useEffect, useState } from "react";
import { useOutletContext } from "react-router";

export default function CreditHistorial() {
  const { merchantId } = useOutletContext<{ merchantId: string }>();

  const [credits, setCredits] = useState<Credit[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const hasNextPage = credits.length === pageSize;
  const hasPreviousPage = page > 1;
  const formatDate = (isoDate: string) => {
  if (!isoDate) return "—";
  return new Intl.DateTimeFormat("es-ES", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "UTC", // o tu zona de negocio fija, pero la MISMA en server y client
  }).format(new Date(isoDate));
};

  const formatCurrency = (amount: number | string | null | undefined) => {
    if (amount == null) return "—";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(Number(amount));
  };

  useEffect(() => {
    async function loadCredits() {
      try {
        setLoading(true);

        const response = await fetch(
          'http://localhost:8000/api/credits',
          {
            headers: { "X-Merchant-ID": String(merchantId) },
          }
        );

        if (!response.ok) {
          throw new Error(`Error cargando créditos: ${response.status}`);
        }

        const data: Credit[] = await response.json();
        setCredits(data);
      } catch (error) {
        console.error('Error loading credits', error);
      } finally {
        setLoading(false);
      }
    }

    if (merchantId) void loadCredits();
  }, [page, merchantId]);

  async function handleDelete(id: number) {
    const confirmed = window.confirm(
      '¿Seguro que deseas eliminar este crédito? Esta acción no se puede deshacer.',
    );
    if (!confirmed) return;

    try {
      const response = await fetch(
        `http://localhost:8000/api/credits/${id}`,
        {
          method: 'DELETE',
          headers: { "X-Merchant-ID": String(merchantId) },
        },
      );

      if (!response.ok) {
        const text = await response.text();
        console.error('Error deleting credit', response.status, text);
        alert('No se pudo eliminar el crédito. Revisa la consola para más detalles.');
        return;
      }

      // Remove the deleted credit from state
      setCredits((prev) => prev.filter((c) => c.id !== id));
    } catch (error) {
      console.error('Error deleting credit', error);
      alert('Ocurrió un error al eliminar el crédito.');
    }
  }


  return (
    <s-page heading="Créditos" inlineSize="large">
      <s-button slot="primary-action" href="/app/registre_credit">
        Registrar Crédito
      </s-button>

      <s-section>
        <s-heading>Lista de Créditos Emitidos</s-heading>

        <s-table
          paginate
          loading={loading}
          hasNextPage={hasNextPage}
          hasPreviousPage={hasPreviousPage}
          onNextPage={() => {
            if (hasNextPage) {
              setPage((p) => p + 1);
            }
          }}
          onPreviousPage={() => {
            if (hasPreviousPage) {
              setPage((p) => Math.max(1, p - 1));
            }
          }}
        >
          {/* Header row */}
          <s-table-header-row>
              <s-table-header>
                <s-stack direction="inline" justifyContent="center">
                  ID
                </s-stack>
              </s-table-header>
              <s-table-header>
                <s-stack direction="inline" justifyContent="center">
                  Fecha
                </s-stack>
              </s-table-header>
              <s-table-header>
                <s-stack direction="inline" justifyContent="center">
                  Cliente
                </s-stack>
              </s-table-header>
              <s-table-header>
                <s-stack direction="inline" justifyContent="center">
                  Monto Crédito
                </s-stack>
              </s-table-header>
              <s-table-header>
                <s-stack direction="inline" justifyContent="center">
                  Último monto abonado
                </s-stack>
              </s-table-header>
              <s-table-header>
                <s-stack direction="inline" justifyContent="center">
                  Saldo Restante
                </s-stack>
              </s-table-header>
              <s-table-header>
                <s-stack direction="inline" justifyContent="center">
                  Observaciones de Abono
                </s-stack>
              </s-table-header>
              <s-table-header>
                <s-stack direction="inline" justifyContent="center">
                  Número de cuotas
                </s-stack>
              </s-table-header>
              <s-table-header>
                <s-stack direction="inline" justifyContent="center">
                  Estatus
                </s-stack>
              </s-table-header>
              <s-table-header>
                <s-stack direction="inline" justifyContent="center">
                  Acciones
                </s-stack>
              </s-table-header>
          </s-table-header-row>
          <s-table-body>

            {/* Data rows */}
            {credits.map((credit) => (
              <s-table-row
                key={credit.id}
              >
                  <s-table-cell>
                  <s-stack direction="inline" justifyContent="center">
                    {credit.id}
                  </s-stack>
                </s-table-cell>
                <s-table-cell>
                  <s-stack direction="inline" justifyContent="center">
                    {formatDate(credit.created_at)}
                  </s-stack>
                </s-table-cell>

                <s-table-cell>
                  <s-stack direction="inline" justifyContent="center">
                    {credit.customer?.full_name || 'Desconocido'}
                  </s-stack>
                </s-table-cell>

                <s-table-cell>
                  <s-stack direction="inline" justifyContent="center">
                    {formatCurrency(credit.total_amount)}
                  </s-stack>
                </s-table-cell>

                <s-table-cell>
                  <s-stack direction="inline" justifyContent="center">
                    {formatCurrency(credit.last_payment_amount)}
                  </s-stack>
                </s-table-cell>

                <s-table-cell>
                  <s-stack direction="inline" justifyContent="center">
                    {formatCurrency(credit.balance)}
                  </s-stack>
                </s-table-cell>

                <s-table-cell>
                  <s-stack direction="inline" justifyContent="center">
                    {credit.last_payment_notes ? credit.last_payment_notes.replace('[DISTRIBUTE_EXCESS]', '[Distribución de Excedente]') : "—"}
                  </s-stack>
                </s-table-cell>

                <s-table-cell>
                  <s-stack direction="inline" justifyContent="center">
                    {credit.installments_count}
                  </s-stack>
                </s-table-cell>

                <s-table-cell>
                  <s-stack direction="inline" justifyContent="center">
                    <s-badge 
                      tone={
                        credit.status === 'EMITIDO' ? 'neutral' : 
                        credit.status === 'PENDIENTE_ACTIVACION' ? 'warning' : 
                        credit.status === 'EN_PROGRESO' ? 'info' : 
                        credit.status === 'PAGADO' ? 'success' : 
                        'info'
                      }
                    >
                      {credit.status}
                    </s-badge>
                  </s-stack>
                </s-table-cell>

                <s-table-cell>
                  <s-button-group>
                    <s-button slot="secondary-actions" icon="view" href={`/app/credit_detail/${credit.id}`}/>
                    <s-button slot="secondary-actions" icon="edit" href={`/app/credit_detail/${credit.id}`}/>
                    <s-button slot="secondary-actions" icon="delete"
                      onClick={(event: Event) => {
                        event.preventDefault();
                        handleDelete(credit.id);
                      }}
                    />
                  </s-button-group>
                </s-table-cell>
              </s-table-row>
            ))}
          </s-table-body>
        </s-table>
      </s-section>

      <s-divider />

          {/*Footer*/}
          <s-stack padding="base" alignItems="center">
            <s-text>¿Tienes alguna duda?<s-link href="/app/credit_detail">Contáctanos</s-link>.</s-text>
          </s-stack>
    </s-page>
  );
}
