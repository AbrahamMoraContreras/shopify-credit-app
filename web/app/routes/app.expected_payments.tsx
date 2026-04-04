import { useState, useMemo, useEffect } from "react";
import { type LoaderFunctionArgs, type ActionFunctionArgs } from "react-router";
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
  customer_name: string;
  customer_email?: string;
  installment_number?: number | null;
  due_date?: string | null;
  expected_amount: number;
  status: string;
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const accessToken = await getAccessTokenForShop(session.shop);
  if (!accessToken) throw new Error("Token no disponible");

  const res = await fetch(`${BACKEND_URL}/api/payments/expected`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error("Error fetching expected payments");

  const payments: ExpectedPayment[] = await res.json();
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

    if (!res.ok) {
      return { error: "No se pudo enviar", key };
    }
    return { success: true, key };
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
  }>();

  const [statusMap, setStatusMap] = useState<Record<string, string>>({});

  useEffect(() => {
    if (actionData?.key) {
      const state = actionData.success ? "sent" : "error";
      setStatusMap((prev) => ({ ...prev, [actionData.key as string]: state }));

      setTimeout(() => {
        setStatusMap((prev) => ({
          ...prev,
          [actionData.key as string]: "idle",
        }));
      }, 4000);
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
      default:
        return "neutral";
    }
  };

  return (
    <s-page heading="Pagos Esperados" inlineSize="large">
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
                        {payment.status}
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
                          disabled={submittingKey === key || undefined}
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
                        No hay pagos esperados en este momento.
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
