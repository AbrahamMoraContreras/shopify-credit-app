import * as React from "react";
import {
  UIModalAttributes,
  SAppWindowAttributes,
  UINavMenuAttributes,
  SAppNavAttributes,
  UISaveBarAttributes,
  UITitleBarAttributes,
} from '@shopify/app-bridge-types';

interface AppBridgeElements {
  'ui-modal': UIModalAttributes;
  's-app-window': SAppWindowAttributes;
  'ui-nav-menu': UINavMenuAttributes;
  's-app-nav': SAppNavAttributes;
  'ui-save-bar': UISaveBarAttributes;
  'ui-title-bar': UITitleBarAttributes;
}

declare global {
  namespace JSX {
    interface IntrinsicElements extends AppBridgeElements { }
  }
}
import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { Outlet, useLoaderData, useRouteError } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { AppProvider } from "@shopify/shopify-app-react-router/react";
import { authenticate } from "../shopify.server";
import { getAccessTokenForShop } from "../lib/auth.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);

  const accessToken = await getAccessTokenForShop(session.shop) || "";

  return {
    apiKey: process.env.SHOPIFY_API_KEY || "",
    merchantId: "",
    shopDomain: session.shop,
    accessToken,
  };
};

export default function App() {
  const { apiKey, merchantId, shopDomain, accessToken } = useLoaderData<typeof loader>();

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
      <Outlet context={{ merchantId, shopDomain, accessToken }} />
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
