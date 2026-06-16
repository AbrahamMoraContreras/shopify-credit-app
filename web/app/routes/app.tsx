import * as React from "react";
import {
  UIModalAttributes,
  SAppWindowAttributes,
  UINavMenuAttributes,
  SAppNavAttributes,
  UISaveBarAttributes,
  UITitleBarAttributes,
} from "@shopify/app-bridge-types";
import { Outlet, useLoaderData, useRouteError } from "react-router";
import { AppProvider } from "@shopify/shopify-app-react-router/react";

interface AppBridgeElements {
  "ui-modal": UIModalAttributes;
  "s-app-window": SAppWindowAttributes;
  "ui-nav-menu": UINavMenuAttributes;
  "s-app-nav": SAppNavAttributes;
  "ui-save-bar": UISaveBarAttributes;
  "ui-title-bar": UITitleBarAttributes;
}

declare global {
  namespace JSX {
    interface IntrinsicElements extends AppBridgeElements {}
  }
}
import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { redirect } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import { getAccessTokenForShop } from "../lib/auth.server";

function isDocumentRequest(request: Request) {
  const accept = request.headers.get("Accept") || "";
  const xrw = request.headers.get("X-Requested-With") || "";
  return accept.includes("text/html") && xrw !== "XMLHttpRequest";
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  let session;

  try {
    ({ session } = await authenticate.admin(request));
  } catch (error: any) {
    // Si authenticate.admin lanza un Response (por ejemplo, 401 inválido)
    if (
      error instanceof Response &&
      error.status === 401 &&
      isDocumentRequest(request)
    ) {
      const url = new URL(request.url);
      const shop = url.searchParams.get("shop");
      if (shop) {
        return redirect(`/auth?shop=${shop}`);
      }
    }

    throw error;
  }

  const apiKey = process.env.SHOPIFY_API_KEY || "";
  const accessToken = await getAccessTokenForShop(session.shop);

  return {
    apiKey,
    shopDomain: session.shop,
    accessToken,
  };
};

import { useState, useEffect } from "react";
import { useFetcher } from "react-router";

function NotificationsBell() {
  const fetcher = useFetcher();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data) {
      if (Array.isArray(fetcher.data)) {
        setNotifications(fetcher.data);
      }
    }
  }, [fetcher.state, fetcher.data]);

  const loadNotifications = () => {
    if (fetcher.state === "idle") {
      fetcher.load("/app/notifications");
    }
  };

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 15000); // poll every 15s
    return () => clearInterval(interval);
  }, []);

  const unreadCount = notifications.filter((n) => !n.changes?.is_read).length;

  const markAsRead = async (id: number) => {
    const formData = new FormData();
    formData.append("intent", "read");
    formData.append("id", String(id));
    fetcher.submit(formData, { method: "POST", action: "/app/notifications" });
    setNotifications((prev) =>
      prev.map((n) =>
        n.id === id ? { ...n, changes: { ...n.changes, is_read: true } } : n
      )
    );
  };

  const markAllAsRead = async () => {
    const formData = new FormData();
    formData.append("intent", "read_all");
    fetcher.submit(formData, { method: "POST", action: "/app/notifications" });
    setNotifications((prev) =>
      prev.map((n) => ({
        ...n,
        changes: { ...n.changes, is_read: true },
      }))
    );
  };

  return (
    <div style={{ position: "fixed", bottom: "20px", right: "20px", zIndex: 9999 }}>
      {/* Floating Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: "56px",
          height: "56px",
          borderRadius: "50%",
          backgroundColor: "#008060", // Shopify green
          color: "white",
          border: "none",
          cursor: "pointer",
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          outline: "none",
          transition: "transform 0.2s",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.05)")}
        onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ width: "24px", height: "24px" }}
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
        </svg>
        {unreadCount > 0 && (
          <span
            style={{
              position: "absolute",
              top: "-2px",
              right: "-2px",
              backgroundColor: "#d82c0d", // Polaris critical red
              color: "white",
              borderRadius: "50%",
              width: "20px",
              height: "20px",
              fontSize: "12px",
              fontWeight: "bold",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
            }}
          >
            {unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div
          style={{
            position: "absolute",
            bottom: "70px",
            right: "0",
            width: "360px",
            maxHeight: "450px",
            backgroundColor: "white",
            borderRadius: "8px",
            boxShadow: "0 4px 20px rgba(0, 0, 0, 0.15)",
            border: "1px solid #e1e3e5",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "12px 16px",
              borderBottom: "1px solid #e1e3e5",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              backgroundColor: "#f6f6f7",
            }}
          >
            <span style={{ fontWeight: 600, fontSize: "14px", color: "#202223" }}>
              Notificaciones
            </span>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                style={{
                  background: "none",
                  border: "none",
                  color: "#008060",
                  cursor: "pointer",
                  fontSize: "12px",
                  fontWeight: 500,
                  padding: 0,
                }}
              >
                Marcar todo como leído
              </button>
            )}
          </div>

          {/* List */}
          <div style={{ overflowY: "auto", flex: 1 }}>
            {notifications.length === 0 ? (
              <div style={{ padding: "32px 16px", textAlign: "center", color: "#6d7175" }}>
                No tienes notificaciones
              </div>
            ) : (
              notifications.map((n) => {
                const isRead = n.changes?.is_read;
                const paymentId = n.changes?.payment_id;
                return (
                  <div
                    key={n.id}
                    onClick={() => {
                      if (!isRead) markAsRead(n.id);
                    }}
                    style={{
                      padding: "12px 16px",
                      borderBottom: "1px solid #f1f2f4",
                      backgroundColor: isRead ? "white" : "#f1f8f5",
                      cursor: "pointer",
                      transition: "background-color 0.1s",
                      display: "flex",
                      flexDirection: "column",
                      gap: "4px",
                    }}
                  >
                    <div style={{ fontSize: "13px", color: "#202223", lineHeight: "1.4", textAlign: "left" }}>
                      {n.changes?.message}
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "11px", color: "#6d7175" }}>
                        {new Date(n.timestamp).toLocaleDateString("es-ES", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      {paymentId && (
                        <a
                          href={`/app/payment_detail/${paymentId}`}
                          style={{
                            fontSize: "11px",
                            color: "#008060",
                            textDecoration: "none",
                            fontWeight: 500,
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          Ver Pago →
                        </a>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const { apiKey, shopDomain, accessToken } = useLoaderData<typeof loader>();

  return (
    <AppProvider embedded apiKey={apiKey}>
      <ui-nav-menu>
        <s-link href="/app">Home</s-link>
        <s-link href="/app/shopify_customers">Clientes Shopify</s-link>
        <s-link href="/app/credits">Creditos</s-link>
        <s-link href="/app/registre_credit">Registrar Crédito</s-link>
        <s-link href="/app/payments">Pagos</s-link>
        <s-link href="/app/expected_payments">Pagos Esperados</s-link>
        <s-link href="/app/registre_payment">Registrar Pago</s-link>
        <s-link href="/app/settings">Configuracion</s-link>
      </ui-nav-menu>

      <Outlet context={{ shopDomain, accessToken }} />
      <NotificationsBell />
    </AppProvider>
  );
}

export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
