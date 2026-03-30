import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import { useLoaderData, useActionData, useSubmit, useNavigation, redirect, useFetcher } from "react-router";
import { authenticate } from "../shopify.server";
import { getAccessTokenForShop } from "../lib/auth.server";
import { toNumber, calculateInstallmentAmount } from './components/utils/app.number';
import { generateInstallmentSchedule } from './components/utils/date';
import { useMemo, useState, useEffect } from 'react';
import { PAY_METHODS } from './components/constants/payMethods';

interface ShopifyCustomer {
  id: string;
  displayName: string;
  email: string | null;
  phone: string | null;
}

interface ShopifyProduct {
  id: string;
  title: string;
  productType: string;
  status: string;
  totalInventory: number;
  variants: {
    nodes: {
      id: string;
      price: string;
      inventoryItem: {
        id: string;
      };
    }[];
  };
}

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session, admin } = await authenticate.admin(request);
  const formData = await request.formData();
  const payload = JSON.parse(formData.get("payload") as string);

  try {
    const accessToken = await getAccessTokenForShop(session.shop);

    if (!accessToken) {
      return { error: "No se pudo obtener el token de acceso desde el servidor." };
    }

    const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";
    const response = await fetch(`${BACKEND_URL}/api/credits`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json();
      let errorMsg = "Error al registrar el crédito";
      if (typeof errorData.detail === "string") {
        errorMsg = errorData.detail;
      } else if (Array.isArray(errorData.detail)) {
        errorMsg = errorData.detail.map((e: { msg: string; loc?: string[] }) => e.msg).join(", ");
      }
      return { error: errorMsg };
    }

    // 2) Sincronizar Inventario en Shopify (SOLO si el crédito se creó con éxito)
    try {
      if (payload.inventory_adjustments && payload.inventory_adjustments.length > 0) {
        const inventoryMutation = `
          mutation inventoryAdjustQuantities($input: InventoryAdjustQuantitiesInput!) {
            inventoryAdjustQuantities(input: $input) {
              userErrors {
                field
                message
              }
            }
          }
        `;

        const inventoryResponse = await admin.graphql(inventoryMutation, {
          variables: {
            input: {
              reason: "correction",
              name: "available",
              changes: payload.inventory_adjustments.map((adj: any) => ({
                delta: adj.delta,
                inventoryItemId: adj.inventoryItemId,
              })),
            },
          },
        });

        const inventoryResult = await inventoryResponse.json();
        const userErrors = inventoryResult.data?.inventoryAdjustQuantities?.userErrors;

        if (userErrors && userErrors.length > 0) {
          console.error("[registre_credit] Error adjusting inventory:", userErrors);
        }
      }
    } catch (invError) {
      console.error("[registre_credit] Unexpected error during inventory sync:", invError);
    }

    return redirect("/app/credits");
  } catch (error) {
    console.error("[registre_credit] Action error:", error);
    return { error: "Error de conexión con el servidor. Verifique que el backend esté ejecutándose." };
  }
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const url = new URL(request.url);

  if (url.searchParams.has("customerReputationId")) {
    const accessToken = await getAccessTokenForShop(session.shop);
    const searchId = url.searchParams.get("customerReputationId");
    if (!searchId) return { reputation: null };
    try {
      const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";
      const r = await fetch(`${BACKEND_URL}/api/customers?shopify_customer_id=${searchId}&limit=1`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      if (r.ok) {
        const data = await r.json();
        const found = Array.isArray(data) ? data[0] : null;
        return { reputation: found?.reputation ?? null };
      }
    } catch { return { reputation: null }; }
    return { reputation: null };
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
      products(first: 50) {
        nodes {
          id
          title
          productType
          status
          totalInventory
          variants(first: 1) {
            nodes {
              id
              price
              inventoryItem {
                id
              }
              sku
            }
          }
        }
      }
    }
  `);

  const { data } = await response.json();
  const customers: ShopifyCustomer[] = data?.customers?.nodes ?? [];
  const products: ShopifyProduct[] = data?.products?.nodes ?? [];

  return { customers, products };
};

export const headers = () => ({
  "Cache-Control": "no-cache, no-store, must-revalidate",
});

export default function RegistreCredit() {
  const { customers = [], products = [] } = useLoaderData<typeof loader>();
  const actionData = useActionData<{ error?: string }>();
  const submit = useSubmit();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting" || navigation.state === "loading";


  const [clientError, setClientError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [customerReputation, setCustomerReputation] = useState<string | null>(null);

  // Sync actionData error into local state so it can be reset on navigation
  useEffect(() => {
    if (actionData?.error) setActionError(actionData.error);
  }, [actionData]);

  // Clear errors when navigation starts (user switches tabs / leaves page)
  useEffect(() => {
    if (navigation.state === "loading") {
      setActionError(null);
      setClientError(null);
    }
  }, [navigation.state]);

  const initialForm = {
    customer: '',
    customer_id: '',
    total_credit_amount: '',
    payMethod: '',
    exchange_rate: '',
    datepay: '',
    first_payment_date: '',
    frequency: 'fiado' as 'quincenal' | 'mensual' | 'fiado',
    installment_number: '1',
    installment_amount: ''
  };

  //Datos temporales del formulario
  const [form, setForm] = useState(initialForm);

  useEffect(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    setForm(prev => ({ ...prev, first_payment_date: `${y}-${m}-${d}` }));
  }, []);
  const [selectedProducts, setSelectedProductsState] = useState<Record<string, boolean>>({});
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  const selectedCustomer = useMemo(() => {
    if (!form.customer) return undefined;
    return customers.find((c) => c.id === form.customer);
  }, [form.customer, customers]);

  // Obtener la reputacion crediticia de cada cliente desde el backend para mostrarlo en el iframe
  const reputationFetcher = useFetcher<{ reputation: string | null }>();

  useEffect(() => {
    if (!form.customer) {
      setCustomerReputation(null);
      return;
    }
    const numericId = form.customer.split('/').pop();
    reputationFetcher.load(`/app/registre_credit?customerReputationId=${numericId}`);
  }, [form.customer]);

  useEffect(() => {
    if (reputationFetcher.data !== undefined) {
      setCustomerReputation(reputationFetcher.data?.reputation || null);
    }
  }, [reputationFetcher.data]);

  const totalProductsAmount = useMemo(() => {
    return products.reduce((sum, p) => {
      if (!selectedProducts[p.id]) return sum;
      const qty = quantities[p.id] ?? 0;
      const price = Number(p.variants.nodes[0]?.price ?? 0);
      return sum + price * qty;
    }, 0);
  }, [products, selectedProducts, quantities]);

  const totalCreditNumber = totalProductsAmount;
  const installmentNumber = parseInt(form.installment_number, 10) || 0;
  
  const installmentAmount = useMemo(() => {
      if (installmentNumber <= 0) return 0;
      return totalCreditNumber / installmentNumber;
  }, [totalCreditNumber, installmentNumber]);

  const schedule = useMemo(() => {
    if (!form.first_payment_date || installmentNumber <= 0 || form.frequency === 'fiado') return [];
    return generateInstallmentSchedule(form.first_payment_date, form.frequency as 'quincenal' | 'mensual', installmentNumber);
  }, [form.first_payment_date, form.frequency, installmentNumber]);

  // Clear errors when form changes
  useEffect(() => {
    if (clientError || actionData?.error) {
      setClientError(null);
    }
  }, [form, selectedProducts, quantities]);

  // Product selection & quantities


  const handleToggleProduct = (productId: string, checked: boolean) => {
    setSelectedProductsState((prev) => ({ ...prev, [productId]: checked }));
    if (!checked) {
      setQuantities((prev) => ({ ...prev, [productId]: 0 }));
    }
  };

  const handleQuantityChange = (productId: string, value: string) => {
    const numeric = Number(value || 0);
    setQuantities((prev) => ({
      ...prev,
      [productId]: Number.isNaN(numeric) ? 0 : numeric,
    }));
  };

  const handleClear = () => {
    if (window.confirm("¿Está seguro de que desea limpiar todos los campos? Esta acción no se puede deshacer.")) {
      setForm(initialForm);
      setSelectedProductsState({});
      setQuantities({});
    }
  };

  const handleRegisterCredit = (isDraft: boolean = false) => {
    setClientError(null);

    if (!form.customer) {
      setClientError("Por favor, seleccione un cliente.");
      return;
    }

    const selectedList = products.filter(p => selectedProducts[p.id] && (quantities[p.id] || 0) > 0);
    if (selectedList.length === 0) {
      setClientError("Debe seleccionar al menos un producto con cantidad mayor a cero.");
      return;
    }

    // Extracción del Shopify ID de cada clientes
    const shopifyIdMatch = form.customer.match(/\/(\d+)$/);
    const numericCustomerId = shopifyIdMatch ? parseInt(shopifyIdMatch[1], 10) : 0;

    const concept = selectedList.map(p => `${p.title} (x${quantities[p.id]})`).join(", ");

    const inventoryAdjustments = selectedList
      .map(p => ({
        inventoryItemId: p.variants.nodes[0]?.inventoryItem.id,
        delta: -(quantities[p.id] || 0), // Extracción de inventario
      }))
      .filter(adj => !!adj.inventoryItemId);

    // Encontrar el objeto del cliente para obtener su displayName
    const selected = customers.find(c => String(c.id) === String(form.customer) || c.id.endsWith(numericCustomerId.toString()));
    const customerName = selected?.displayName;
    const customerEmail = selected?.email;

    console.log("[registre_credit] Registering credit for:", {
      gid: form.customer,
      numericId: numericCustomerId,
      foundName: customerName,
      foundEmail: customerEmail
    });

    const payload = {
      customer_id: numericCustomerId,
      customer_name: customerName,
      customer_email: customerEmail,
      concept: concept,
      total_amount: totalProductsAmount,
      installments_count: form.frequency === 'fiado' ? 0 : (parseInt(form.installment_number, 10) || 1),
      first_due_date: form.frequency === 'fiado' ? null : form.first_payment_date,
      frequency: form.frequency,
      status: isDraft ? 'PENDIENTE_ACTIVACION' : 'EMITIDO',
      inventory_adjustments: inventoryAdjustments,
      items: selectedList.map(p => {
        const variant = p.variants.nodes[0];
        const qty = quantities[p.id] || 0;
        const price = Number(variant?.price ?? 0);
        return {
          product_id: p.id,
          product_code: (variant as any)?.sku || null,
          product_name: p.title,
          quantity: qty,
          unit_price: price,
          total_price: price * qty
        };
      })
    };

    submit({ payload: JSON.stringify(payload) }, { method: "post" });
  };

  // Total amount from selected products
  const description = useMemo(() => {
    if (!selectedCustomer) {
      return 'Seleccione un cliente para ver más detalles.';
    }
    return (
      selectedCustomer.displayName + '\n'+
      `Teléfono: ${selectedCustomer.phone ?? 'Sin teléfono'}\n`+
      `Email: ${selectedCustomer.email ?? 'Sin email'}`
    );
  }, [selectedCustomer]);

  const descriptionLines = description.split('\n');


    return (
    <s-page heading="Registrar Crédito">
      <s-stack gap="base">
        { (actionError || clientError) && (
          <s-banner tone="critical" >
            <s-text>{clientError || actionError}</s-text>
          </s-banner>
        )}
        <s-grid
          gridTemplateColumns="repeat(2, 2fr, 1fr)"
          gap="small"
          justifyContent="center"
          padding="base"
        >
          <s-section>
            <s-heading>Nombre de Cliente</s-heading>

            <s-grid
              gridTemplateColumns="repeat(2, 3fr)"
              gap="small"
              padding="base"
              alignContent="space-between"
              >
              <s-grid-item gridColumn="span 1">
                {customers.length === 0 ? (
                  <s-text color="subdued">No hay clientes registrados en esta tienda.</s-text>
                ) : (
                <s-select
                    label="Cliente"
                    details="Seleccione nombre del cliente"
                    value={form.customer}
                    onChange={(event: any) => {
                      const raw = (event.currentTarget as any).value as string | undefined;
                      setForm((prev) => ({
                        ...prev,
                        customer: raw ?? '',
                        customer_id: raw ?? ''
                      }));
                    }}
                    >
                  <s-option value="">Seleccione un cliente</s-option>
                  {customers.map(customer => (
                    <s-option key={customer.id} value={customer.id}>{customer.displayName}</s-option>
                    ))}
                </s-select>
                )}
              </s-grid-item>

              <s-grid-item gridColumn="auto">
                <s-section accessibilityLabel="Info de los clientes">
                  <s-stack direction="inline" justifyContent="center" padding='base'>
                    <s-box>
                      <s-text tone='info'>
                        {descriptionLines.map((line, index) => (
                          <span key={index}>
                            {line}
                            {index < descriptionLines.length - 1 && <br />}
                          </span>
                        ))}
                      </s-text>
                      {customerReputation && (() => {
                        const repConfig: Record<string, { tone: string; label: string }> = {
                          excelente: { tone: "success", label: "⭐ Excelente" },
                          buena: { tone: "info", label: "👍 Buena" },
                          regular: { tone: "attention", label: "⚠️ Regular" },
                          mala: { tone: "critical", label: "❌ Mala" },
                        };
                        const rc = repConfig[customerReputation];
                        if (!rc) return null;
                        const badgeTone = (rc.tone as any) || "info";
                        return (
                          <s-stack direction="inline" gap="small" alignItems="center" padding="small">
                            <s-text type="strong">Reputación crediticia:</s-text>
                            <s-badge tone={badgeTone}>{rc.label}</s-badge>
                          </s-stack>
                        );
                      })()}
                    </s-box>
                  </s-stack>
                </s-section>
              </s-grid-item>
            </s-grid>

            <s-grid
              gridTemplateColumns="repeat(3, 1fr)"
              gap="base"
              padding="base"
              alignItems="center"
              placeContent="normal center"
            >
              <s-grid-item gridColumn="auto"  >
                <s-section>
                  <s-stack gap="small" direction="block" alignItems="center">
                    <s-text color="subdued" type="strong">Monto total del Crédito (USD)</s-text>
                    <s-box padding="small" borderStyle="solid" borderRadius="base">
                      <s-text fontVariantNumeric="tabular-nums">
                        ${totalProductsAmount.toFixed(2)}
                      </s-text>
                    </s-box>
                  </s-stack>
                </s-section>
              </s-grid-item>

              <s-grid-item gridColumn="auto"  >
                {form.frequency !== 'fiado' && (
                  <s-section >
                    <s-stack gap="base" direction="inline" justifyContent="center">
                      <s-box padding="small" borderStyle="solid" borderRadius="base">
                        <s-number-field
                            label="Numero de Cuotas"
                            placeholder="1"
                            inputMode="decimal"
                            value={form.installment_number}
                            onChange={(event: any) => {
                              const raw = (event.currentTarget as any).value as
                                | string
                                | undefined;
                              setForm((prev) => ({
                                ...prev,
                                installment_number: raw ?? '',
                              }));
                            }}
                            step={1}
                            min={1}
                            max={100000}
                        />
                      </s-box>
                    </s-stack>
                  </s-section>
                )}
              </s-grid-item>

              <s-grid-item gridColumn="auto"  >
                {form.frequency !== 'fiado' && (
                  <s-section padding="base">
                    <s-stack gap="small" direction="inline" justifyContent="center">
                      <s-text color="subdued" type="strong">Monto por Cuotas:   ${installmentAmount.toFixed(2)}</s-text>
                    </s-stack>
                    <s-stack padding="large-100" gap="small" direction="inline" justifyContent="center">
                      <s-text type="strong" color="subdued">
                        Total: ${totalCreditNumber.toFixed(2)} | Cuotas: {installmentNumber}
                      </s-text>
                    </s-stack>
                  </s-section>
                )}
              </s-grid-item>
            </s-grid>

            <s-grid
              gridTemplateColumns="repeat(3, 1fr)"
              gap="small"
              padding="base"
              alignItems="center"
            >

              {/* Fecha de emisión / fecha base */}
              <s-grid-item gridColumn="span 1" >
                <s-section>
                  <s-stack gap="small" direction="inline" justifyContent="center">
                    <s-date-field
                      label="Fecha de emisión del crédito"
                      details="Permite calcular las fechas de pago"
                      value={form.first_payment_date}
                      onChange={(event: any) => {
                      const raw = (event.currentTarget as any).value as string | undefined;
                      setForm((prev) => ({
                        ...prev,
                        first_payment_date: raw ?? '',
                      }));
                    }}
                  />
                  </s-stack>
                </s-section>
              </s-grid-item>

              <s-grid-item gridColumn="span 1" >
                {/* Frecuencia de pago */}
                <s-stack gap="small" direction="inline" justifyContent="center">
                  <s-select
                    label="Frecuencia de pago"
                    name="payment period"
                    details="Seleccione el tipo de crédito"
                    value={form.frequency}
                    onChange={(event: any) => {
                    const raw = (event.currentTarget as any).value as string | undefined;
                      if (raw === 'quincenal' || raw === 'mensual' || raw === 'fiado') {
                        setForm((prev) => ({
                          ...prev,
                          frequency: raw,
                        }));
                      }
                    }}
                  >
                    <s-option value="fiado">Fiado (Préstamo flexible)</s-option>
                    <s-option value="quincenal">Quincenal</s-option>
                    <s-option value="mensual">Mensual</s-option>
                  </s-select>
                </s-stack>
              </s-grid-item>

                {/* Lista de fechas calculadas */}
                {form.frequency !== 'fiado' && (
                  <s-grid-item gridColumn="span 1" >
                    <s-section>
                      <s-stack gap="small" direction="inline" justifyContent="center">
                        <s-text type="strong" color="subdued">
                          Próximas fechas de pago
                        </s-text>
                      </s-stack>
                      <s-stack gap="small" direction="inline" justifyContent="center">
                        {schedule.length === 0 ? (
                            <s-text color="subdued">
                              Ingrese la fecha de emisión y el número de cuotas para ver el calendario.
                            </s-text>
                          ) : (
                            schedule.map((date, index) => (
                                <s-text key={`${date}-${index}`}>
                                  Cuota {index + 1}: {date}
                                  {index < schedule.length - 1 && <br />}
                                </s-text>
                            ))
                          )}
                      </s-stack>
                    </s-section>
                  </s-grid-item>
                )}

            </s-grid>

            <s-grid
              gridTemplateColumns="repeat(1, 3fr)"
              gap="small"
              padding="base"
            >
              <s-text-area
                    label="Notas"
                    value=""
                    rows={3}
                />
            </s-grid>
          </s-section>


      {/* Sección: Lista de productos + edición de cantidades */}
      <s-section padding="base">
        <s-heading>Lista de Productos</s-heading>

        {products.length === 0 ? (
          <s-text color="subdued">No hay productos disponibles en esta tienda.</s-text>
        ) : (
        <s-table variant="auto">
          <s-table-header-row>
            <s-table-header listSlot='primary'>Seleccionar</s-table-header>
            <s-table-header >Producto</s-table-header>
            <s-table-header format="numeric">Precio</s-table-header>
            <s-table-header format="numeric">Cantidad</s-table-header>
            <s-table-header format="numeric">Disponible</s-table-header>
            <s-table-header >Estado</s-table-header>
          </s-table-header-row>

          <s-table-body>
            {products.map((product) => {
              const isSelected = selectedProducts[product.id] ?? false;
              const qty = quantities[product.id] ?? 0;
              const available = product.totalInventory ?? 0;
              const exceedsInventory = isSelected && qty > available;

              return (
              <s-table-row key={product.id}>
                {/* Checkbox */}
                <s-table-cell>
                  <s-checkbox
                    checked={isSelected || undefined}
                    onChange={(event: any) => {
                      const checked = (event.currentTarget as any).checked as boolean;
                      handleToggleProduct(product.id, checked);
                    }}
                  />
                </s-table-cell>

                {/* Product name */}
                <s-table-cell>
                  <s-text type="strong">{product.title}</s-text>
                </s-table-cell>

                {/* Price */}
                <s-table-cell>
                  <s-text fontVariantNumeric="tabular-nums">
                    ${Number(product.variants.nodes[0]?.price ?? 0).toFixed(2)}
                  </s-text>
                </s-table-cell>

                {/* Quantity input */}
                <s-table-cell>
                  <s-number-field
                    name={`qty-${product.id}`}
                    label={`Cantidad para ${product.title}`}
                    labelAccessibilityVisibility="exclusive"
                    min={0}
                    step={1}
                    value={String(qty || "")}
                    disabled={!isSelected || undefined}
                    onInput={(event: any) =>
                      handleQuantityChange(
                        product.id,
                        (event.currentTarget as any).value
                      )
                    }
                  />
                </s-table-cell>

                {/* Available inventory */}
                <s-table-cell>
                  <s-text fontVariantNumeric="tabular-nums">
                    {available}
                  </s-text>
                </s-table-cell>

                {/* Dynamic state label */}
                <s-table-cell>
                  {!isSelected ? (
                    <s-badge tone="info">No seleccionado</s-badge>
                  ) : exceedsInventory ? (
                    <s-badge tone="critical">⚠ Excede inventario</s-badge>
                  ) : qty > 0 ? (
                    <s-badge tone="success">✓ Disponible</s-badge>
                  ) : (
                    <s-badge tone="info">Seleccionado</s-badge>
                  )}
                </s-table-cell>
              </s-table-row>
              );
            })}
          </s-table-body>
        </s-table>
        )}
      </s-section>

      {/* Sección: Resumen del pedido con los productos seleccionados */}
      <s-section padding="base">
        <s-heading>Resumen del pedido</s-heading>

        {products.filter((p) => selectedProducts[p.id] && (quantities[p.id] ?? 0) > 0).length === 0 ? (
          <s-paragraph color="subdued">
            No has seleccionado ningún producto todavía.
          </s-paragraph>
        ) : (
          <>
            <s-table variant="auto">
              <s-table-header-row>
                <s-table-header listSlot='primary'>Producto</s-table-header>
                <s-table-header listSlot='primary'>Fecha de Emisión</s-table-header>
                <s-table-header format="numeric">Precio Unit.</s-table-header>
                <s-table-header format="numeric">Cantidad</s-table-header>
                <s-table-header format="numeric">Subtotal</s-table-header>
                <s-table-header listSlot='primary'>Método de Pago</s-table-header>
                {form.frequency !== 'fiado' && <s-table-header listSlot='primary'>Cuotas</s-table-header>}
                {form.frequency !== 'fiado' && <s-table-header listSlot='primary'>Próxima Cuota</s-table-header>}
              </s-table-header-row>

              <s-table-body>
                {products
                  .filter((p) => selectedProducts[p.id] && (quantities[p.id] ?? 0) > 0)
                  .map((product) => {
                    const qty = quantities[product.id] ?? 0;
                    const price = Number(product.variants.nodes[0]?.price ?? 0);
                    const subtotal = price * qty;
                    return (
                    <s-table-row key={product.id}>
                      <s-table-cell>
                        <s-text type="strong">{product.title}</s-text>
                      </s-table-cell>

                      <s-table-cell>
                        {new Date().toLocaleDateString()}
                      </s-table-cell>

                      <s-table-cell>
                        <s-text fontVariantNumeric="tabular-nums">
                          ${price.toFixed(2)}
                        </s-text>
                      </s-table-cell>

                      <s-table-cell>
                        <s-text fontVariantNumeric="tabular-nums">{qty}</s-text>
                      </s-table-cell>

                      <s-table-cell>
                        <s-text fontVariantNumeric="tabular-nums">
                          ${subtotal.toFixed(2)}
                        </s-text>
                      </s-table-cell>

                      <s-table-cell>{form.payMethod || '—'}</s-table-cell>
                      {form.frequency !== 'fiado' && <s-table-cell>{form.installment_number || '—'}</s-table-cell>}
                      {form.frequency !== 'fiado' && <s-table-cell>{schedule[0] ?? '—'}</s-table-cell>}
                    </s-table-row>
                    );
                  })}
              </s-table-body>
            </s-table>

            <s-divider direction="inline" color="base" />

            <s-stack justifyContent="end">
              <s-text type="strong" fontVariantNumeric="tabular-nums">
                Total aproximado: ${totalProductsAmount.toFixed(2)}
              </s-text>
            </s-stack>
          </>
        )}
      </s-section>

          {/* Pendiente Align End. */}
          <s-divider/>
          <s-section padding="base">
            <s-stack
              direction="block"
              alignItems="end"
              gap="small-100"
            >
                  <s-heading>Monto Total del Crédito: ${totalProductsAmount.toFixed(2)}</s-heading>
                  {form.frequency !== 'fiado' && installmentNumber > 0 && (
                    <s-heading>Monto por Cuota ({installmentNumber} cuotas): ${installmentAmount.toFixed(2)}</s-heading>
                  )}
            </s-stack>
          </s-section>
          <s-stack padding="base"  direction="inline" justifyContent="end" >
            <s-button-group gap="base" >
              <s-button 
                slot="primary-action" 
                onClick={() => handleRegisterCredit(false)}
                loading={isSubmitting || undefined}
                disabled={isSubmitting || undefined}
                accessibilityLabel="Confirmar registro de crédito"
              >
                Registrar Crédito
              </s-button>
              <s-button 
                slot="secondary-actions" 
                tone="neutral"
                onClick={() => handleRegisterCredit(true)}
                loading={isSubmitting || undefined}
                disabled={isSubmitting || undefined}
                accessibilityLabel="Guardar crédito como borrador"
              >
                Guardar Borrador
              </s-button>
              <s-button 
                slot="tertiary-actions" 
                tone="critical"
                onClick={handleClear}
                disabled={isSubmitting || undefined}
                accessibilityLabel="Limpiar formulario de crédito"
              >
                Limpiar Campos
              </s-button>
            </s-button-group>
          </s-stack>
        </s-grid>

        <s-divider/>

      </s-stack>
      {/*Footer*/}
      <s-stack padding="base" alignItems="center" gap="tight">
          <s-text color="subdued" variant="bodySm">Desarrollado por Opentech LCC</s-text>
          <s-text>¿Tienes alguna duda? <s-link href="https://lccopen.tech/contact" target="_blank">Contáctanos</s-link>.</s-text>
        </s-stack>
    </s-page>
  );
}
