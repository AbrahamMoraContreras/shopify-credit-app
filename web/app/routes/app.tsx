'use client'

import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { Outlet, useLoaderData, useRouteError } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { AppProvider } from "@shopify/shopify-app-react-router/react";

import { authenticate } from "../shopify.server";

const BACKEND_URL = "http://localhost:8000";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);

  // Resolve or auto-register the merchant using the Shopify shop domain
  let merchantId = "";
  try {
    const res = await fetch(`${BACKEND_URL}/api/merchants/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shop_domain: session.shop }),
    });

    if (res.ok) {
      const data = await res.json();
      merchantId = data.id;
    } else {
      console.error("[app.tsx] Failed to register merchant:", res.status);
    }
  } catch (err) {
    console.error("[app.tsx] Backend unreachable for merchant registration:", err);
  }

  return {
    apiKey: process.env.SHOPIFY_API_KEY || "",
    merchantId,
    shopDomain: session.shop,
  };
};

export default function App() {
  const { apiKey, merchantId, shopDomain } = useLoaderData<typeof loader>();

  return (

    <AppProvider embedded apiKey={apiKey}>

      <s-app-nav>

        <s-link href="/app">Home</s-link>
        <s-link href="/app/shopify_customers">Clientes Shopify</s-link>
        <s-link href="/app/credits">Creditos</s-link>
        <s-link href="/app/registre_credit">Registrar Crédito</s-link>
        <s-link href="/app/payments">Pagos</s-link>
        <s-link href="/app/expected_payments">Pagos Esperados</s-link>
        <s-link href="/app/registre_payment">Registrar Pago</s-link>
        <s-link href="/app/settings">Configuracion</s-link>
      </s-app-nav>
      <Outlet context={{ merchantId, shopDomain }} />
    </AppProvider>



  );
}

// Shopify needs React Router to catch some thrown responses, so that their headers are included in the response.
export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
