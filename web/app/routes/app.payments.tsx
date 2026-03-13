'use client'

import { useEffect, useState } from "react";
import { useOutletContext } from "react-router";

interface PaymentListItem {
  id: number;
  credit_id: number;
  amount: number; // Último Abono
  status: string;
  reference_number: string;
  installments_covered?: string;
  payment_date: string;
  customer_name: string;
  customer_email?: string;
  credit_total_amount: number;
  credit_balance: number;
  customer_favorable_balance: number;
  products_items: number;
  products_quantity: number;
  products_total: number;
}

interface PaymentProof {
  id: number;
  status: string;
  submitted_at: string;
  reference_number: string;
  bank_name: string;
  amount: number;
  notes: string;
  customer_email: string;
  customer_name: string;
  payment_id: number;
  credit_id: number;
}

export default function PaymentHistorial() {
  const { merchantId } = useOutletContext<{ merchantId: string }>();

  const [payments, setPayments] = useState<PaymentListItem[]>([]);
  const [proofs, setProofs] = useState<PaymentProof[]>([]);
  const [loading, setLoading] = useState(false);
  const [proofsLoading, setProofsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const pageSize = 20;

  async function loadPayments() {
    if (!merchantId) return;
    try {
      setLoading(true);
      const offset = (page - 1) * pageSize;
      const response = await fetch(
        `http://localhost:8000/api/payments?limit=${pageSize}&offset=${offset}`,
        {
          headers: { "X-Merchant-ID": String(merchantId) },
        }
      );

      if (!response.ok) {
        throw new Error(`Error loading payments: ${response.status}`);
      }

      const data: PaymentListItem[] = await response.json();
      setPayments(data);
      setSelectedIds(new Set()); // Reset selection on page change
    } catch (error) {
      console.error("Error loading payments:", error);
    } finally {
      setLoading(false);
    }
  }

  async function loadProofs() {
    if (!merchantId) return;
    try {
      setProofsLoading(true);
      const res = await fetch(`http://localhost:8000/api/payments/payment-proofs`, {
        headers: { "X-Merchant-ID": String(merchantId) },
      });
      if (res.ok) {
        const data: PaymentProof[] = await res.json();
        setProofs(data.filter(p => p.status === "PENDIENTE"));
      }
    } catch (e) {
      console.error("Error loading proofs:", e);
    } finally {
      setProofsLoading(false);
    }
  }

  useEffect(() => {
    void loadPayments();
    void loadProofs();
  }, [page, merchantId]);

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(payments.map(p => p.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleBatchReview = async (status: string) => {
    if (selectedIds.size === 0) return;
    try {
      setLoading(true);
      const response = await fetch(`http://localhost:8000/api/payments/batch-review`, {
        method: "PATCH",
        headers: { 
          "X-Merchant-ID": merchantId,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          payment_ids: Array.from(selectedIds),
          status
        })
      });
      if (response.ok) {
        await loadPayments();
      }
    } catch (error) {
      console.error("Error in batch review:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`¿Está seguro de eliminar ${selectedIds.size} pagos?`)) return;
    
    try {
      setLoading(true);
      const response = await fetch(`http://localhost:8000/api/payments/batch-delete`, {
        method: "POST", // Backend expectations
        headers: { 
          "X-Merchant-ID": merchantId,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          payment_ids: Array.from(selectedIds)
        })
      });
      if (response.ok) {
        await loadPayments();
      }
    } catch (error) {
      console.error("Error in batch delete:", error);
    } finally {
      setLoading(false);
    }
  };


  const handleApproveProof = async (proof: PaymentProof) => {
    if (!confirm(`¿Aprobar el pago de $${proof.amount} reportado por ${proof.customer_name}?`)) return;
    try {
      setLoading(true);
      // 1. Approve the actual payment
      const resApprove = await fetch(`http://localhost:8000/api/payments/batch-review`, {
        method: "PATCH",
        headers: { "X-Merchant-ID": merchantId, "Content-Type": "application/json" },
        body: JSON.stringify({ payment_ids: [proof.payment_id], status: "APROBADO" })
      });
      
      if (resApprove.ok) {
        // 2. Mark proof as reviewed
        await fetch(`http://localhost:8000/api/payments/payment-proofs/${proof.id}/mark-reviewed`, {
          method: "PATCH",
          headers: { "X-Merchant-ID": merchantId }
        });
        await loadPayments();
        await loadProofs();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleRejectProof = async (proof: PaymentProof) => {
    if (!confirm(`¿Rechazar el pago de $${proof.amount} reportado por ${proof.customer_name}?`)) return;
    try {
      setLoading(true);
      const resReject = await fetch(`http://localhost:8000/api/payments/batch-review`, {
        method: "PATCH",
        headers: { "X-Merchant-ID": merchantId, "Content-Type": "application/json" },
        body: JSON.stringify({ payment_ids: [proof.payment_id], status: "RECHAZADO" })
      });
      if (resReject.ok) {
        await fetch(`http://localhost:8000/api/payments/payment-proofs/${proof.id}/mark-reviewed`, {
          method: "PATCH",
          headers: { "X-Merchant-ID": merchantId }
        });
        await loadPayments();
        await loadProofs();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const getStatusTone = (status: string) => {
    switch (status) {
      case "APROBADO": return "success";
      case "RECHAZADO": return "critical";
      case "EN_REVISION": return "warning";
      case "REGISTRADO": return "info";
      case "CANCELADO": return "neutral";
      default: return "neutral";
    }
  };

  const hasApprovedSelected = Array.from(selectedIds).some(
    id => payments.find(p => p.id === id)?.status === "APROBADO"
  );

  return (
    <s-page heading="Historial de Pagos" inlineSize="large">
      <s-button slot="primary-action" href="/app/registre_payment">
        Registrar Pago
      </s-button>

      {proofs.length > 0 && (
        <s-section padding="base">
          <s-heading>Comprobantes por Revisar ({proofs.length})</s-heading>
          <s-text color="subdued">Reportados por clientes vía página externa.</s-text>
          <s-table variant="auto">
            <s-table-header-row>
              <s-table-header>Fecha Envío</s-table-header>
              <s-table-header>Cliente</s-table-header>
              <s-table-header>Banco Origen</s-table-header>
              <s-table-header>Referencia</s-table-header>
              <s-table-header format="numeric">Monto</s-table-header>
              <s-table-header>Acciones</s-table-header>
            </s-table-header-row>
            <s-table-body>
              {proofs.map(p => (
                <s-table-row key={p.id}>
                  <s-table-cell>{new Date(p.submitted_at).toLocaleString()}</s-table-cell>
                  <s-table-cell>
                    <s-stack gap="none">
                      <s-text type="strong">{p.customer_name}</s-text>
                      <s-text color="subdued">{p.customer_email}</s-text>
                    </s-stack>
                  </s-table-cell>
                  <s-table-cell>{p.bank_name}</s-table-cell>
                  <s-table-cell>{p.reference_number}</s-table-cell>
                  <s-table-cell>${p.amount.toFixed(2)}</s-table-cell>
                  <s-table-cell>
                    <s-button-group>
                      <s-button tone="auto" onClick={() => handleApproveProof(p)}>Aprobar</s-button>
                      <s-button tone="critical" variant="secondary" onClick={() => handleRejectProof(p)}>Rechazar</s-button>
                      <s-button variant="secondary" href={`/app/credit_detail/${p.credit_id}`}>Ver Detalles</s-button>
                    </s-button-group>
                  </s-table-cell>
                </s-table-row>
              ))}
            </s-table-body>
          </s-table>
        </s-section>
      )}

      <s-divider />
      
      <s-section padding="base">
        <s-heading>Lista de Pagos</s-heading>
        <s-table
          paginate
          loading={loading || undefined}
          hasNextPage={payments.length === pageSize}
          hasPreviousPage={page > 1}
          onNextPage={() => setPage(p => p + 1)}
          onPreviousPage={() => setPage(p => Math.max(1, p - 1))}
        >
          <s-table-header-row>
            <s-table-header>
              <s-checkbox 
                checked={selectedIds.size === payments.length && payments.length > 0}
                onChange={(e: any) => handleSelectAll(!!e.target.checked)}
              />
            </s-table-header>
            <s-table-header format="numeric">Crédito ID</s-table-header>
            <s-table-header>Fecha</s-table-header>
            <s-table-header>Cliente</s-table-header>
            <s-table-header format="numeric">Monto del Crédito</s-table-header>
            <s-table-header format="numeric">Último Abono</s-table-header>
            <s-table-header format="numeric">Saldo Restante</s-table-header>
            <s-table-header format="numeric">Saldo a Favor</s-table-header>
            <s-table-header format="numeric">Referencia</s-table-header>
            <s-table-header>Cuotas Cubiertas</s-table-header>
            <s-table-header>Estado</s-table-header>
            <s-table-header>Acciones</s-table-header>
          </s-table-header-row>
          <s-table-body>
            {payments.map((payment) => {
              const creditTotal = Number(payment.credit_total_amount);
              const abono = Number(payment.amount);
              const diff = creditTotal - abono;
              
              const saldoRestante = Math.max(0, diff);
              const saldoAFavor = Math.max(0, abono - creditTotal);

              let cuotasCubiertas = "-";
              if (payment.installments_covered) {
                  cuotasCubiertas = payment.installments_covered.split(',').filter(x => x.trim()).length.toString() + " Cuota(s)";
              }

              return (
                <s-table-row key={payment.id}>
                  <s-table-cell>
                    <s-checkbox 
                      checked={selectedIds.has(payment.id)}
                      onChange={() => toggleSelect(payment.id)}
                    />
                  </s-table-cell>
                  <s-table-cell>{payment.credit_id}</s-table-cell>
                  <s-table-cell>
                    {new Date(payment.payment_date).toLocaleDateString()}
                  </s-table-cell>
                  <s-table-cell>{payment.customer_name}</s-table-cell>
                  <s-table-cell>${creditTotal.toFixed(2)}</s-table-cell>
                  <s-table-cell>${abono.toFixed(2)}</s-table-cell>
                  <s-table-cell>${saldoRestante.toFixed(2)}</s-table-cell>
                  <s-table-cell>${saldoAFavor.toFixed(2)}</s-table-cell>
                  <s-table-cell>{payment.reference_number}</s-table-cell>
                  <s-table-cell>{cuotasCubiertas}</s-table-cell>
                  <s-table-cell>
                    <s-badge tone={getStatusTone(payment.status)}>
                      {payment.status}
                    </s-badge>
                  </s-table-cell>
                  <s-table-cell>
                    <s-button 
                        slot="secondary-actions" 
                        icon="view" 
                        href={`/app/credit_detail/${payment.credit_id}`}
                    >
                        Ver Crédito
                    </s-button>
                  </s-table-cell>
                </s-table-row>
              );
            })}
            {!loading && payments.length === 0 && (
              <s-table-row>
                <s-table-cell>
                  <div style={{ textAlign: 'center', gridColumn: 'span 11' }}>
                    <s-text color="subdued">No se encontraron pagos registrados.</s-text>
                  </div>
                </s-table-cell>
              </s-table-row>
            )}
          </s-table-body>
        </s-table>

        <s-divider />
        
        <s-stack direction="inline" gap="small" padding="base" justifyContent="end" alignItems="center">
          <s-text color="subdued">
            {selectedIds.size} seleccionados
          </s-text>
          <s-button 
            tone="auto" 
            disabled={selectedIds.size === 0 || hasApprovedSelected || loading || undefined}
            onClick={() => handleBatchReview("APROBADO")}
          >
            Aprobar Pago
          </s-button>
          <s-button 
            tone="critical" 
            disabled={selectedIds.size === 0 || loading || undefined}
            onClick={() => handleBatchReview("RECHAZADO")}
          >
            Rechazar Pago
          </s-button>
          <s-button 
            disabled={selectedIds.size === 0 || loading || undefined}
            onClick={() => handleBatchReview("CANCELADO")}
          >
            Cancelar Pago
          </s-button>
          <s-button 
            tone="critical" 
            variant="secondary"
            disabled={selectedIds.size === 0 || loading || undefined}
            onClick={handleBatchDelete}
          >
            Eliminar Pago
          </s-button>
        </s-stack>
      </s-section>

      <s-divider />

      <s-stack padding="base" alignItems="center">
        <s-text>¿Tienes alguna duda? <s-link href="">Contáctanos</s-link>.</s-text>
      </s-stack>
    </s-page>
  );
}
