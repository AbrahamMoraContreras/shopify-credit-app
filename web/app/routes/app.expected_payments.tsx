import { useState, useMemo, useEffect } from "react";
import { type LoaderFunctionArgs, type ActionFunctionArgs } from "react-router";
import { useRouteError, isRouteErrorResponse } from "react-router";
import {
  useLoaderData,
  useSubmit,
  useNavigation,
  useActionData,
} from "react-router";
import { ClientDate } from "../components/ClientDate";
import { getAccessTokenForShop } from "../lib/auth.server";
import { authenticate } from "../shopify.server";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";

export interface ExpectedPayment {
  credit_id: number;
  installment_id?: number | null;
  customer_id: number;
  shopify_customer_id?: number | null;
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;
  installment_number?: number | null;
  due_date?: string | null;
  expected_amount: number;
  status: string;
}

const cleanPhoneForWhatsApp = (phone: string): string => {
  return phone.replace(/[^0-9]/g, "");
};

const WhatsAppIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" width="16" height="16" fill="#25D366" style={{ verticalAlign: "middle" }}>
    <path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7.9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z"/>
  </svg>
);

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session, admin } = await authenticate.admin(request);
  const accessToken = await getAccessTokenForShop(session.shop);
  if (!accessToken) throw new Error("Token no disponible");

  const res = await fetch(`${BACKEND_URL}/api/payments/expected`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error("Error fetching expected payments");

  const payments: ExpectedPayment[] = await res.json();

  const shopifyIds = [...new Set(payments.map(p => p.shopify_customer_id).filter(Boolean))];
  
  if (shopifyIds.length > 0) {
    try {
      const idQuery = shopifyIds.map(id => `id:${id}`).join(" OR ");
      const shopifyRes = await admin.graphql(`
        query getFreshCustomers($query: String!) {
          customers(first: 50, query: $query) {
            nodes {
              id
              phone
              email
            }
          }
        }
      `, { variables: { query: idQuery } });
      
      const shopifyData = await shopifyRes.json();
      const freshCustomers = shopifyData.data?.customers?.nodes || [];
      
      const phoneMap: Record<string, string> = {};
      freshCustomers.forEach((c: any) => {
        const numericId = c.id.split("/").pop();
        if (c.phone) phoneMap[numericId] = c.phone;
      });
      
      payments.forEach(p => {
        if (p.shopify_customer_id && phoneMap[p.shopify_customer_id]) {
          p.customer_phone = phoneMap[p.shopify_customer_id];
        }
      });
    } catch (e) {
      console.error("Error syncing shopify customers in expected payments:", e);
    }
  }

  return { payments };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const accessToken = await getAccessTokenForShop(session.shop);
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "send_reminder") {
    const key = formData.get("key") as string;
    const body = {
      credit_id: Number(formData.get("credit_id")),
      installment_id: formData.get("installment_id")
        ? Number(formData.get("installment_id"))
        : null,
      amount: Number(formData.get("amount")),
      customer_email: formData.get("customer_email") as string,
    };

    const res = await fetch(`${BACKEND_URL}/api/payments/payment-tokens`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    if (!res.ok) {
      return { error: "No se pudo enviar", key };
    }
    return { success: true, key, url: data.url };
  }
  return null;
};

export const headers = () => ({
  "Cache-Control": "no-cache, no-store, must-revalidate",
});

export default function ExpectedPayments() {
  const { payments } = useLoaderData<typeof loader>();
  const submit = useSubmit();
  const navigation = useNavigation();
  const actionData = useActionData<{
    success?: boolean;
    error?: string;
    key?: string;
    url?: string;
  }>();

  const [statusMap, setStatusMap] = useState<Record<string, string>>({});
  const [urlsMap, setUrlsMap] = useState<Record<string, string>>({});

  useEffect(() => {
    if (actionData?.key) {
      const state = actionData.success ? "sent" : "error";
      setStatusMap((prev) => ({ ...prev, [actionData.key as string]: state }));
      if (actionData.url) {
        setUrlsMap((prev) => ({ ...prev, [actionData.key as string]: actionData.url }));
      }
    }
  }, [actionData]);

  const loading =
    navigation.state === "loading" || navigation.state === "submitting";
  const submittingKey = navigation.formData?.get("key") as string | undefined;

  const handleSendReminder = (payment: ExpectedPayment) => {
    let email = payment.customer_email;

    if (!email) {
      const promptedEmail = window.prompt(
        "El cliente no tiene email registrado. Por favor, ingréselo para enviar el recordatorio:",
      );
      if (!promptedEmail || !promptedEmail.includes("@")) {
        alert("Email no válido operacion cancelada.");
        return;
      }
      email = promptedEmail;
    }

    const key = payment.installment_id
      ? `${payment.credit_id}-${payment.installment_id}`
      : `${payment.credit_id}-fiado`;

    submit(
      {
        intent: "send_reminder",
        key,
        credit_id: payment.credit_id.toString(),
        installment_id: payment.installment_id
          ? payment.installment_id.toString()
          : "",
        amount: payment.expected_amount.toString(),
        customer_email: email,
      },
      { method: "post" },
    );
  };

  const getStatusTone = (status: string) => {
    switch (status) {
      case "PENDIENTE":
        return "info";
      case "VENCIDO":
        return "critical";
      case "EN_REVISION":
        return "warning";
      default:
        return "neutral";
    }
  };

  return (
    <s-page heading="Cobros Esperados" inlineSize="large">
      <s-section padding="base">
        <s-heading>Cuotas y Saldos por Cobrar</s-heading>
        <s-text color="subdued">
          Visualiza las cuotas pendientes de todos los créditos activos y envía
          recordatorios de pago.
        </s-text>
        <s-box paddingBlockStart="base">
          <s-table loading={loading || undefined}>
            <s-table-header-row>
              <s-table-header format="numeric">Crédito ID</s-table-header>
              <s-table-header>Cliente</s-table-header>
              <s-table-header>Vencimiento</s-table-header>
              <s-table-header format="numeric">Nro Cuota</s-table-header>
              <s-table-header format="numeric">Monto Esperado</s-table-header>
              <s-table-header>Estado</s-table-header>
              <s-table-header>Acciones</s-table-header>
            </s-table-header-row>
            <s-table-body>
              {payments.map((payment) => {
                const key = payment.installment_id
                  ? `${payment.credit_id}-${payment.installment_id}`
                  : `${payment.credit_id}-fiado`;
                return (
                  <s-table-row key={key}>
                    <s-table-cell>{payment.credit_id}</s-table-cell>
                    <s-table-cell>
                      <s-stack gap="none">
                        <s-text type="strong">{payment.customer_name}</s-text>
                        <s-text color="subdued">
                          {payment.customer_email || "Sin email"}
                        </s-text>
                        {payment.customer_phone && (
                          <s-text color="subdued">
                            Tel: {payment.customer_phone}
                          </s-text>
                        )}
                      </s-stack>
                    </s-table-cell>
                    <s-table-cell>
                      {payment.due_date ? (
                        <ClientDate dateString={payment.due_date} />
                      ) : (
                        "Pendiente"
                      )}
                    </s-table-cell>
                    <s-table-cell>
                      {payment.installment_number
                        ? payment.installment_number
                        : "Fiado (Total)"}
                    </s-table-cell>
                    <s-table-cell>
                      ${payment.expected_amount.toFixed(2)}
                    </s-table-cell>
                    <s-table-cell>
                      <s-badge tone={getStatusTone(payment.status)}>
                        {payment.status?.replace(/_/g, " ")}
                      </s-badge>
                    </s-table-cell>
                    <s-table-cell>
                      <s-button-group>
                        <s-button
                          slot="secondary-actions"
                          icon="view"
                          href={`/app/credit_detail/${payment.credit_id}`}
                          accessibilityLabel="Ver detalles de cuota"
                        >
                          Ver Detalles
                        </s-button>
                        <s-button
                          slot="secondary-actions"
                          tone="auto"
                          disabled={submittingKey === key || payment.status === "EN_REVISION" || statusMap[key] === "sent" || undefined}
                          onClick={() => handleSendReminder(payment)}
                          accessibilityLabel="Enviar recordatorio de pago"
                        >
                          {submittingKey === key
                            ? "Enviando..."
                            : statusMap[key] === "sent"
                              ? "¡Enviado!"
                              : statusMap[key] === "error"
                                ? "Reintentar"
                                : "Enviar Recordatorio"}
                        </s-button>
                        {payment.customer_phone && (
                          <s-button
                            slot="secondary-actions"
                            onClick={() => {
                              if (!urlsMap[key]) {
                                alert("Por favor, haga clic primero en 'Enviar Recordatorio' para generar el link de pago único.");
                                return;
                              }
                              const phone = cleanPhoneForWhatsApp(payment.customer_phone!);
                              let msg = `Hola ${payment.customer_name}, le recordamos que tiene un pago pendiente de $${payment.expected_amount.toFixed(2)} correspondiente al Credito #${payment.credit_id}${payment.installment_number ? ` (Cuota #${payment.installment_number})` : " (Fiado)"}. Por favor, realice su pago a la brevedad posible.`;
                              
                              if (urlsMap[key]) {
                                msg += `\n\nPuede confirmar y pagar su deuda directamente en el siguiente enlace: ${urlsMap[key]}`;
                              }
                              
                              window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, "_blank");
                            }}
                            accessibilityLabel="Enviar recordatorio por WhatsApp"
                            tone={urlsMap[key] ? "success" : undefined}
                          >
                            <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                              <WhatsAppIcon /> WhatsApp
                            </span>
                          </s-button>
                        )}
                        {statusMap[key] === "sent" && (
                          <s-button
                            slot="secondary-actions"
                            icon="undo"
                            onClick={() => setStatusMap((prev) => ({ ...prev, [key]: "idle" }))}
                            accessibilityLabel="Restablecer botón de recordatorio"
                          />
                        )}
                      </s-button-group>
                    </s-table-cell>
                  </s-table-row>
                );
              })}
              {!loading && payments.length === 0 && (
                <s-table-row>
                  <s-table-cell>
                    <div style={{ textAlign: "center", gridColumn: "span 7" }}>
                      <s-text color="subdued">
                        No hay cobros esperados en este momento.
                      </s-text>
                    </div>
                  </s-table-cell>
                </s-table-row>
              )}
            </s-table-body>
          </s-table>
        </s-box>
      </s-section>
    </s-page>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  const errorMessage = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : error instanceof Error
      ? error.message
      : "Ocurrió un error inesperado al conectar con el servidor.";

  return (
    <s-page heading="Error" inlineSize="large">
      <s-section padding="base">
        <s-banner tone="critical" heading="Ha ocurrido un problema">
          <p>{errorMessage}</p>
          <p style={{ marginTop: "10px" }}>
            Por favor, reintenta más tarde o revisa tu conexión.
          </p>
        </s-banner>
      </s-section>
    </s-page>
  );
}
