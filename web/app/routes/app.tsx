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
import { redirect } from "react-router"; // o "@remix-run/node" según tu runtime
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import { getAccessTokenForShop } from "../lib/auth.server"; // ajusta la ruta real

function isDocumentRequest(request: Request) {
  const accept = request.headers.get("Accept") || "";
  const xrw = request.headers.get("X-Requested-With") || "";
  // Heurística simple: si acepta HTML y no es XHR, lo tratamos como documento
  return accept.includes("text/html") && xrw !== "XMLHttpRequest";
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  let session;

  try {
    ({ session } = await authenticate.admin(request));
  } catch (error: any) {
    // Si authenticate.admin lanza un Response (por ejemplo, 401 inválido)
    if (error instanceof Response && error.status === 401 && isDocumentRequest(request)) {
      const url = new URL(request.url);
      const shop = url.searchParams.get("shop");
      if (shop) {
        // Redirige al flujo de auth/bounce page
        return redirect(`/auth?shop=${shop}`);
      }
    }

    // Para XHR o si no hay shop, dejamos que el error siga su curso
    throw error;
  }

  const apiKey = process.env.SHOPIFY_API_KEY || "";

  // Opcional: si quieres resolver el accessToken aquí
  const accessToken = await getAccessTokenForShop(session.shop);

  return {
    apiKey,
    shopDomain: session.shop,
    accessToken, // lo pasamos a Outlet context por si lo necesitas en el cliente
  };
};



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

      {/* Aquí pasas también accessToken por si algún componente lo quiere para fetch client-side */}
      <Outlet context={{ shopDomain, accessToken }} />
    </AppProvider>
  );
}

// ErrorBoundary y headers se quedan igual
export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};