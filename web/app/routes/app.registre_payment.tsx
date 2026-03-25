'use client'

import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import { useLoaderData, useSubmit, useNavigation, useOutletContext, useActionData, useFetcher } from "react-router";
import { authenticate } from "../shopify.server";
import { getAccessTokenForShop } from "../lib/auth.server";
import { useState, useMemo, useEffect } from "react";
import { redirect } from "react-router";

interface ShopifyCustomer {
  id: string;
  displayName: string;
  email: string | null;
  phone: string | null;
}

interface Installment {
  id: number;
  credit_id: number;
  installment_number: number;
  amount: number;
  due_date: string;
  status: string;
  paid: boolean;
  original_amount?: number;
  paid_amount?: number;
}

interface Credit {
  id: number;
  concept: string;
  total_amount: number;
  balance: number;
  status: string;
  installments: Installment[];
  installments_count?: number;
  customer?: {
    id: number;
    full_name: string;
    favorable_balance: number;
  };
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const url = new URL(request.url);

  if (url.searchParams.has("searchCredits")) {
    const accessToken = await getAccessTokenForShop(session.shop);
    const searchCustomer = url.searchParams.get("customer_id");
    const searchCreditId = url.searchParams.get("credit_id");
    const searchDate = url.searchParams.get("created_at_date");
    let apiUrl = `http://localhost:8000/api/credits?status=EMITIDO&status=PENDIENTE_ACTIVACION&status=EN_PROGRESO`;
    
    if (searchCustomer) apiUrl += `&customer_id=${searchCustomer}`;
    if (searchCreditId) apiUrl += `&credit_id=${searchCreditId}`;
    if (searchDate) apiUrl += `&created_at_date=${searchDate}`;

    try {
      const response = await fetch(apiUrl, { headers: { "Authorization": `Bearer ${accessToken}` } });
      if (response.ok) {
        const data = await response.json();
        return { credits: data };
      }
    } catch { return { credits: [] }; }
    return { credits: [] };
  }

  const response = await admin.graphql(`
    {
      customers(first: 50) {
        nodes {
          id
          displayName
          email
          phone
        }
      }
    }
  `);

  const { data } = await response.json();
  const customers: ShopifyCustomer[] = data?.customers?.nodes ?? [];

  return { customers };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const paymentDataStr = formData.get("paymentData");
  
  if (!paymentDataStr) return { error: "No se recibieron datos de pago." };
  
  const paymentData = JSON.parse(paymentDataStr as string);
  const { 
    installments, 
    useFavorableBalance,
    notes,
    paymentDate,
    approvalStatus  // "APROBADO" | "EN_REVISION"
  } = paymentData;
  
  const methodMap: Record<string, string> = {
    "Dolares en efectivo": "CASH",
    "Bolivares en efectivo": "EFECTIVO",
    "Pago movil": "PAGO_MOVIL",
    "Transferencia": "BANK"
  };

  const accessToken = await getAccessTokenForShop(session.shop);

  if (!accessToken) return { error: "No se pudo obtener el token de acceso." };

    try {
        const payload = {
            credit_id: installments[0].creditId,
            apply_to_installments: installments.map((i: any) => i.id).filter((id: number) => id > 0),
            distribute_excess: paymentData.distributeExcess,
            amount: paymentData.amount,
            payment_method: methodMap[paymentData.method] || methodMap["Dolares en efectivo"],
            reference_number: paymentData.reference || `EFECTIVO-${Date.now()}`,
            payment_date: new Date(paymentDate).toISOString(),
            use_favorable_balance: useFavorableBalance || false,
            notes: notes || undefined,
            punctuality_feedback: paymentData.punctualityFeedback ?? undefined
        };

        const res = await fetch('http://localhost:8000/api/payments', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          const detailStr = typeof body.detail === 'object' ? JSON.stringify(body.detail) : (body.detail || res.statusText);
          return { error: `Error procesando pago: ${detailStr}` };
        } 
        
        const created = await res.json().catch(() => null);

        // Auto-approve if user selected "El pago fue revisado y aprobado"
        if (approvalStatus === "APROBADO" && created?.id) {
            await fetch(`http://localhost:8000/api/payments/batch-review`, {
                method: "PATCH",
                headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${accessToken}`,
                },
                body: JSON.stringify({ payment_ids: [created.id], status: "APROBADO" })
            });
        }

  } catch (error) {
    console.error("Action error:", error);
    return { error: "Error de conexión al procesar el pago." };
  }

  return redirect("/app/credits");
};

export const headers = () => ({
  "Cache-Control": "no-cache, no-store, must-revalidate",
});

export default function RegistrePayment() {
  const { customers = [] } = useLoaderData<typeof loader>();
  const actionData = useActionData<{ error?: string }>();
  const { accessToken } = useOutletContext<{ accessToken: string }>();
  const submit = useSubmit();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  const [actionError, setActionError] = useState<string | null>(null);

  // Sync actionData error into local state so it can be cleared on navigation
  useEffect(() => {
    if (actionData?.error) setActionError(actionData.error);
  }, [actionData]);

  // Clear the error banner when the user navigates away and comes back
  useEffect(() => {
    if (navigation.state === "loading") {
      setActionError(null);
    }
  }, [navigation.state]);

  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [searchCreditId, setSearchCreditId] = useState<string>("");
  const [searchDate, setSearchDate] = useState<string>("");
  const [credits, setCredits] = useState<Credit[]>([]);
  const creditsFetcher = useFetcher<{ credits: Credit[] }>();
  const isLoadingCredits = creditsFetcher.state !== "idle";

  const [paymentForm, setPaymentForm] = useState({
    date: "",
    exchangeRate: "100",
    method: "Dolares en efectivo",
    amount: "0",
    reference: "",
    notes: "",
    autoSelect: false,
    fiadoFeedback: "" // "" = no aplica, "100" = puntual, "50" = retrasado, "0" = no pagó
  });

  useEffect(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    setPaymentForm(prev => ({ ...prev, date: `${y}-${m}-${d}` }));
  }, []);

  const [selectedInstallments, setSelectedInstallments] = useState<Record<number, boolean>>({});
  const [useFavorableBalance, setUseFavorableBalance] = useState(false);
  const [distributeExcess, setDistributeExcess] = useState(true);
  const [approvalStatus, setApprovalStatus] = useState<"EN_REVISION" | "APROBADO">("EN_REVISION");

  useEffect(() => {
    // We only fetch if at least one search criterion is present
    if (!selectedCustomerId && !searchCreditId && !searchDate) {
      setCredits([]);
      setSelectedInstallments({});
      return;
    }

    const timer = setTimeout(() => {
      let params = new URLSearchParams({ searchCredits: "1" });
      if (selectedCustomerId) params.append("customer_id", selectedCustomerId.split('/').pop()!);
      if (searchCreditId) params.append("credit_id", searchCreditId);
      if (searchDate) params.append("created_at_date", searchDate);
      
      creditsFetcher.load(`/app/registre_payment?${params.toString()}`);
    }, 300); // Debounce for search fields

    return () => clearTimeout(timer);
  }, [selectedCustomerId, searchCreditId, searchDate]);

  useEffect(() => {
    if (creditsFetcher.data?.credits) {
      setCredits(creditsFetcher.data.credits);
    }
  }, [creditsFetcher.data]);

  const activeInstallments = useMemo(() => {
    const all: Installment[] = [];
    credits.forEach(credit => {
      credit.installments.forEach(inst => {
        if (!inst.paid) {
          const original = Number(inst.amount);
          const paidAmt = Number((inst as any).paid_amount || 0);
          all.push({
            ...inst,
            credit_id: credit.id,
            original_amount: original,
            paid_amount: paidAmt,
            amount: original - paidAmt
          });
        }
      });
      if (credit.installments.length === 0 && credit.balance > 0) {
        all.push({
          id: -credit.id,
          credit_id: credit.id,
          installment_number: 0,
          original_amount: Number(credit.total_amount),
          paid_amount: Number(credit.total_amount) - Number(credit.balance),
          amount: Number(credit.balance),
          due_date: "Flexible",
          status: "PENDIENTE",
          paid: false
        });
      }
    });
    return all;
  }, [credits]);

  const selectedCustomerShopify = useMemo(() => {
    return customers.find((c) => c.id === selectedCustomerId);
  }, [selectedCustomerId, customers]);

  const backendCustomerInfo = useMemo(() => {
    if (credits.length > 0 && credits[0].customer) {
        return credits[0].customer;
    }
    return null;
  }, [credits]);

  useEffect(() => {
    if (!paymentForm.autoSelect || activeInstallments.length === 0) return;

    const amount = Number(paymentForm.amount) || 0;
    let remaining = amount;
    const newSelected: Record<number, boolean> = {};

    const sorted = [...activeInstallments].sort((a, b) => {
      if (a.due_date === "Flexible") return 1;
      if (b.due_date === "Flexible") return -1;
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
    });

    for (const inst of sorted) {
      if (remaining >= inst.amount) {
        newSelected[inst.id] = true;
        remaining -= inst.amount;
      } else if (remaining > 0) {
        newSelected[inst.id] = true;
        remaining = 0;
      } else {
        newSelected[inst.id] = false;
      }
    }

    setSelectedInstallments(newSelected);
  }, [paymentForm.amount, paymentForm.autoSelect, activeInstallments]);

  const handleToggleInstallment = (id: number, checked: boolean) => {
    setSelectedInstallments(prev => ({ ...prev, [id]: checked }));
  };

  const selectedTotalDebt = useMemo(() => {
    return activeInstallments.reduce((sum, inst) => {
      if (selectedInstallments[inst.id]) {
        return sum + inst.amount;
      }
      return sum;
    }, 0);
  }, [activeInstallments, selectedInstallments]);

  const paymentAmount = Number(paymentForm.amount) || 0;
  const surplusAmount = Math.max(0, paymentAmount - selectedTotalDebt);
  const remainingDebt = Math.max(0, selectedTotalDebt - paymentAmount);

  const handleConfirmPayment = () => {
    const selectedList = activeInstallments.filter(inst => selectedInstallments[inst.id]);
    if (selectedList.length === 0) {
      alert("Por favor seleccione al menos una cuota o crédito.");
      return;
    }

    const isCashMethod = paymentForm.method === "Dolares en efectivo" || paymentForm.method === "Bolivares en efectivo";
    
    if (!isCashMethod && paymentForm.reference.length !== 13) {
      alert("El número de referencia debe tener exactamente 13 dígitos numéricos.");
      return;
    }

    let finalNotes = paymentForm.notes || "";
    if (paymentForm.autoSelect) {
        finalNotes = `[Auto-selección] ${finalNotes}`;
    }

    const hasFiado = selectedList.some(i => i.installment_number === 0);
    const punctualityFeedback = hasFiado && paymentForm.fiadoFeedback !== "" ? Number(paymentForm.fiadoFeedback) : undefined;

    const itemsToPay = selectedList.map(inst => ({
        id: inst.id,
        creditId: inst.credit_id,
        amount: inst.amount
    }));

    const data = {
      customerId: selectedCustomerId,
      installments: itemsToPay,
      useFavorableBalance,
      distributeExcess,
      notes: finalNotes.trim(),
      paymentDate: paymentForm.date,
      approvalStatus,  // "APROBADO" | "EN_REVISION"
      amount: paymentAmount,
      method: paymentForm.method,
      reference: paymentForm.reference,
      punctualityFeedback
    };

    submit({ paymentData: JSON.stringify(data) }, { method: "post" });
  };

  const handleReset = () => {
    setSelectedCustomerId("");
    setSearchCreditId("");
    setSearchDate("");
    setPaymentForm({
      date: new Date().toISOString().split('T')[0],
      exchangeRate: "100",
      method: "Dolares en efectivo",
      amount: "0",
      reference: "",
      notes: "",
      autoSelect: false,
      fiadoFeedback: ""
    });
    setSelectedInstallments({});
    setUseFavorableBalance(false);
    setDistributeExcess(true);
    setApprovalStatus("EN_REVISION");
  };

  return (
    <s-page heading="Registrar Pago">
      <s-stack gap="base">
        {actionError && (
          <s-banner tone="critical" onDismiss={() => setActionError(null)}>
            {actionError}
          </s-banner>
        )}
        <s-grid gridTemplateColumns="2.5fr 1fr" gap="base">
          <s-stack gap="base">
            <s-section padding="base">
              <s-heading>Criterios de Búsqueda</s-heading>
              <s-grid gridTemplateColumns="1fr 1fr 1fr" gap="small">
                <s-select
                  label="Cliente"
                  value={selectedCustomerId}
                  onChange={(e: any) => setSelectedCustomerId(e.target?.value || "")}
                >
                  <s-option value="">Seleccione un cliente</s-option>
                  {customers.map(c => (
                    <s-option key={c.id} value={c.id}>{c.displayName}</s-option>
                  ))}
                </s-select>
                <s-number-field 
                  label="ID Crédito"
                  placeholder="Ej: 123"
                  value={searchCreditId}
                  onChange={(e: any) => setSearchCreditId(e.target?.value || "")}
                />
                <s-date-field 
                  label="Fecha de Emisión"
                  value={searchDate}
                  onChange={(e: any) => setSearchDate(e.target?.value || "")}
                />
              </s-grid>
            </s-section>

            <s-section padding="base">
              <s-heading>Registro del Pago</s-heading>
              <s-stack gap="base">

              <s-grid gridTemplateColumns="repeat(3, 1fr)" gap="small">
                <s-date-field
                  label="Fecha de pago"
                  value={paymentForm.date}
                  onChange={(e: any) => setPaymentForm(p => ({ ...p, date: e.target?.value || "" }))}
                />
                <s-select
                  label="Método de pago"
                  value={paymentForm.method}
                  onChange={(e: any) => setPaymentForm(p => ({ ...p, method: e.target?.value || "" }))}
                >
                  <s-option value="Dolares en efectivo">Dólares en efectivo</s-option>
                  <s-option value="Bolivares en efectivo">Bolívares en efectivo</s-option>
                  <s-option value="Pago movil">Pago móvil</s-option>
                  <s-option value="Transferencia">Transferencia</s-option>
                </s-select>

                <s-number-field
                  label="Monto Pagado (USD)"
                  value={paymentForm.amount}
                  onChange={(e: any) => setPaymentForm(p => ({ ...p, amount: e.target?.value || "" }))}
                />
              </s-grid>

              <s-grid gridTemplateColumns="1.5fr 1fr" gap="small">

                {/* Hide reference field for cash methods */}
                {paymentForm.method !== "Dolares en efectivo" && paymentForm.method !== "Bolivares en efectivo" && (
                  <s-text-field
                    label="Referencia"
                    placeholder="Ej: 123456"
                    value={paymentForm.reference}
                    onChange={(e: any) => {
                      const val = e.target?.value || "";
                      const numericVal = val.replace(/\D/g, "").slice(0, 13);
                      setPaymentForm(p => ({ ...p, reference: numericVal }));
                    }}
                  />
                )}
              </s-grid>

              <s-text-area
                 label="Notas adicionales"
                 value={paymentForm.notes}
                 onChange={(e: any) => setPaymentForm(p => ({ ...p, notes: e.target?.value || "" }))}
                 rows={3}
              />

              <s-checkbox
                label="Auto-seleccionar deudas más antiguas"
                checked={paymentForm.autoSelect || undefined}
                onChange={(e: any) => setPaymentForm(p => ({ ...p, autoSelect: !!e.target?.checked }))}
              />

              {activeInstallments.some(i => selectedInstallments[i.id] && i.installment_number === 0) && (
                <s-select
                  label="¿El cliente pagó a tiempo? (Fiado)"
                  value={paymentForm.fiadoFeedback}
                  onChange={(e: any) => setPaymentForm(p => ({ ...p, fiadoFeedback: e.target?.value || "" }))}
                >
                  <s-option value="">-- Sin evaluar --</s-option>
                  <s-option value="100">✅ Sí, puntualmente</s-option>
                  <s-option value="50">⚠️ No, se retrasó</s-option>
                  <s-option value="0">❌ No pagó</s-option>
                </s-select>
              )}

              {/* Approval Status — exclusive two-option select */}
              <s-select
                label="Estado de revisión del pago"
                value={approvalStatus}
                onChange={(e: any) => setApprovalStatus(e.target?.value === "APROBADO" ? "APROBADO" : "EN_REVISION")}
              >
                <s-option value="EN_REVISION">🕐 El pago está pendiente por revisar</s-option>
                <s-option value="APROBADO">✅ El pago fue revisado y aprobado</s-option>
              </s-select>

            </s-stack>
          </s-section>
        </s-stack>

          {/* Right Panel: Customer & Summary */}
          <s-stack gap="base">
            <s-section padding="base">
              <s-heading>Detalles del Cliente</s-heading>
              <s-divider />
              {selectedCustomerShopify ? (
                <s-stack gap="small" padding="base">
                  <s-text type="strong" >{selectedCustomerShopify.displayName}</s-text>
                  <s-text color="subdued" >{selectedCustomerShopify.email || "Sin email"}</s-text>
                  <s-text color="subdued" >{selectedCustomerShopify.phone || "Sin teléfono"}</s-text>
                  {backendCustomerInfo && (
                    <s-box padding="small" borderRadius="base">
                        <s-stack gap="small" padding="large-100">
                            <s-text type="strong">Saldo a Favor Disponible:</s-text>
                            <s-text tone="info">${Number(backendCustomerInfo.favorable_balance).toFixed(2)}</s-text>
                            {Number(backendCustomerInfo.favorable_balance) > 0 && (
                              <s-checkbox
                                label="Usar Saldo a Favor para este pago"
                                checked={useFavorableBalance || undefined}
                                onChange={(e: any) => setUseFavorableBalance(!!e.target?.checked)}
                              />
                            )}
                            {(() => {
                              const rep = (backendCustomerInfo as any).reputation;
                              const repConfig: Record<string, { tone: string; label: string }> = {
                                excelente: { tone: "success", label: "⭐ Excelente" },
                                buena: { tone: "info", label: "👍 Buena" },
                                regular: { tone: "attention", label: "⚠️ Regular" },
                                mala: { tone: "critical", label: "❌ Mala" },
                              };
                              const rc = rep && repConfig[rep];
                              if (!rc) return null;
                              return (
                                <s-stack direction="inline" gap="small" alignItems="center">
                                  <s-text type="strong">Reputación:</s-text>
                                  <s-badge tone={rc.tone}>{rc.label}</s-badge>
                                </s-stack>
                              );
                            })()}
                        </s-stack>
                    </s-box>
                  )}
                </s-stack>
              ) : (
                <s-text color="subdued">Seleccione un cliente para ver detalles.</s-text>
              )}
            </s-section>

            <s-section padding="base">
               <s-heading>Resumen de Operación</s-heading>
               <s-divider />
               <s-stack gap="small" padding="base">
                  <s-stack direction="inline" justifyContent="space-between">
                    <s-text color="subdued">Deuda seleccionada:</s-text>
                    <s-text type="strong">${selectedTotalDebt.toFixed(2)}</s-text>
                  </s-stack>
                  <s-stack direction="inline" justifyContent="space-between">
                    <s-text color="subdued">Monto pagado:</s-text>
                    <s-text type="strong">${paymentAmount.toFixed(2)}</s-text>
                  </s-stack>
                  
                  <s-divider />
                  
                  {surplusAmount > 0 && (
                    <s-stack gap="small">
                        <s-stack direction="inline" justifyContent="space-between">
                            <s-text tone="success" type="strong">Excedente al pagar:</s-text>
                            <s-text tone="success" type="strong">${surplusAmount.toFixed(2)}</s-text>
                        </s-stack>
                        <s-checkbox
                            label="Aplicar excedente a la siguiente cuota pendiente automáticamente"
                            checked={distributeExcess || undefined}
                            onChange={(e: any) => setDistributeExcess(!!e.target?.checked)}
                        />
                    </s-stack>
                  )}

                  {useFavorableBalance && backendCustomerInfo && Number(backendCustomerInfo.favorable_balance) > 0 && (
                    <s-stack direction="inline" justifyContent="space-between">
                        <s-text tone="info" type="strong">Saldo a Favor aplicado:</s-text>
                        <s-text tone="info" type="strong">
                          -${Math.min(Number(backendCustomerInfo.favorable_balance), selectedTotalDebt).toFixed(2)}
                        </s-text>
                    </s-stack>
                  )}
                  
                  <s-stack direction="inline" justifyContent="space-between">
                    <s-text type="strong">Restante de deuda:</s-text>
                    <s-text type="strong">${remainingDebt.toFixed(2)}</s-text>
                  </s-stack>
                  
                  {/* Periodicity Block */}
                  {(() => {
                    const selectedList = activeInstallments.filter(i => selectedInstallments[i.id]);
                    if (selectedList.length === 0) return null;
                    const hasFiado = selectedList.some(i => i.installment_number === 0);
                    const credit = credits.find(c => c.id === selectedList[0]?.credit_id);
                    const count = credit?.installments_count ?? 0;
                    let periodicity = "Fiado";
                    if (!hasFiado && count > 0) {
                      // Determine periodicity based on number of installments per year
                      // 12 → Mensual, 24 or 26 → Quincenal
                      if (count % 24 === 0 || count % 26 === 0) periodicity = "Quincenal";
                      else periodicity = "Mensual";
                    }
                    return (
                      <s-stack direction="inline" justifyContent="space-between">
                        <s-text color="subdued">Periodicidad:</s-text>
                        <s-badge tone="info">{periodicity}</s-badge>
                      </s-stack>
                    );
                  })()}

                  <s-divider />
                  <s-stack direction="inline" justifyContent="space-between">
                    <s-text color="subdued">Estado del pago:</s-text>
                    <s-badge tone={approvalStatus === "APROBADO" ? "success" : "warning"}>
                      {approvalStatus === "APROBADO" ? "✅ Aprobado" : "🕐 En Revisión"}
                    </s-badge>
                  </s-stack>

               </s-stack>
            </s-section>
          </s-stack>
        </s-grid>

        {/* Deudas Table */}
        <s-section padding="base">
          <s-heading>Cuotas y Deudas Pendientes</s-heading>
          <s-divider />
          {isLoadingCredits ? (
            <s-stack padding="base" alignItems="center"><s-spinner /></s-stack>
          ) : activeInstallments.length === 0 ? (
            <s-stack padding="large" alignItems="center">
                <s-text color="subdued">Este cliente no posee deudas pendientes.</s-text>
            </s-stack>
          ) : (
            <s-table variant="auto">
              <s-table-header-row>
                <s-table-header></s-table-header>
                <s-table-header>ID Deuda</s-table-header>
                <s-table-header>Vencimiento</s-table-header>
                <s-table-header>Concepto</s-table-header>
                <s-table-header format="numeric">Monto Original</s-table-header>
                <s-table-header format="numeric">Abonado</s-table-header>
                <s-table-header format="numeric">Por Pagar</s-table-header>
                <s-table-header>Estado</s-table-header>
              </s-table-header-row>
              <s-table-body>
                {activeInstallments.map((inst) => (
                  <s-table-row key={inst.id}>
                    <s-table-cell>
                      <s-checkbox
                        checked={selectedInstallments[inst.id] || undefined}
                        onChange={(e: any) => handleToggleInstallment(inst.id, e.currentTarget.checked)}
                      />
                    </s-table-cell>
                    <s-table-cell>#{inst.credit_id}{inst.installment_number > 0 ? `-${inst.installment_number}` : ""}</s-table-cell>
                    <s-table-cell>{inst.due_date}</s-table-cell>
                    <s-table-cell>{credits.find(c => c.id === inst.credit_id)?.concept || "Crédito"}</s-table-cell>
                    <s-table-cell>
                        <s-text color="subdued">${(inst.original_amount ?? inst.amount).toFixed(2)}</s-text>
                    </s-table-cell>
                    <s-table-cell>
                        <s-text>${(inst.paid_amount ?? 0).toFixed(2)}</s-text>
                    </s-table-cell>
                    <s-table-cell>
                        <s-text type="strong">${inst.amount.toFixed(2)}</s-text>
                    </s-table-cell>
                    <s-table-cell>
                        <s-badge tone="warning">Pendiente</s-badge>
                    </s-table-cell>
                  </s-table-row>
                ))}
              </s-table-body>
            </s-table>
          )}
        </s-section>

        {/* Action Button Bar */}
        <s-divider />
        <s-stack padding="base" direction="inline" justifyContent="end" gap="base">
            <s-button onClick={handleReset} disabled={isSubmitting} accessibilityLabel="Limpiar formulario de pago">Limpiar Campos</s-button>
            <s-button 
                tone="critical" 
                onClick={handleConfirmPayment} 
                loading={isSubmitting || undefined}
                disabled={isSubmitting || (activeInstallments.filter(i => selectedInstallments[i.id]).length === 0)}
                accessibilityLabel="Confirmar y registrar pago seleccionado"
            >
                Confirmar Registro de Pago
            </s-button>
        </s-stack>

      </s-stack>
    </s-page>
  );
}
