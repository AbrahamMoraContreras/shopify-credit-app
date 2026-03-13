import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { Outlet, useLoaderData, useRouteError } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { AppProvider } from "@shopify/shopify-app-react-router/react";
import { authenticate } from "web/app/shopify.server";

//import { authenticate } from "../shopify.server";

// Admin GraphQL query to fetch customers (paginated)
// Validated against the Admin GraphQL schema; requires `read_customers` scope.
const CUSTOMERS_QUERY = `#graphql
  query AppCustomers($first: Int!, $after: String) {
    customers(first: $first, after: $after) {
      edges {
        cursor
        node {
          id
          firstName
          lastName
          defaultEmailAddress {
            emailAddress
          }
          createdAt
          updatedAt
          numberOfOrders
          state
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

type LoaderData = {
  apiKey: string;
  customers: LoaderCustomer[];
  hasNextPage: boolean;
  endCursor: string | null;
};
type LoaderCustomer = {
  id: string;
  displayName: string;
  email?: string | null;
};

type CustomerEdge = {
  node: {
    id: string;
    displayName: string;
    email?: string | null;
  };
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  // Authenticate as the current shop and get an Admin GraphQL client
  const { admin } = await authenticate.admin(request);

  // Call the Admin GraphQL API to fetch customers
  const response = await admin.graphql(CUSTOMERS_QUERY, {
    variables: {
      first: 20,  // fetch up to 20 customers; you currently have 2
      after: null,
    },
  });

  const json = await response.json();

  const connection = json.data?.customers;
  const edges = connection?.edges ?? [];

  
  const customers: LoaderCustomer[] = edges.map((edge: CustomerEdge) => {
    return {
      id: edge.node.id,
      displayName: edge.node.displayName,
      email: edge.node.email,
    };
  });

  return {
    apiKey: process.env.SHOPIFY_API_KEY || "",
    customers,
    hasNextPage: connection?.pageInfo?.hasNextPage ?? false,
    endCursor: connection?.pageInfo?.endCursor ?? null,
  } satisfies LoaderData;
};

export default function App() {
  const { apiKey } = useLoaderData<typeof loader>();

  return (
    <AppProvider embedded apiKey={apiKey}>
      <s-app-nav>
        <s-link href="/app/index">Panel Principal</s-link>
        <s-link href="/app/try">Pruebas</s-link>
        <s-link href="/app/customer_detail">Detalle de Cliente Específico</s-link>
        <s-link href="/app/credits">Creditos</s-link>
        <s-link href="/app/registre_credit">Registrar Crédito</s-link>
        <s-link href="/app/credit_detail">Detalle de Crédito Específico</s-link>
        <s-link href="/app/payments">Pagos</s-link>
        <s-link href="/app/registre_payment">Registrar Pago</s-link>
        <s-link href="/app/payment_detail">Detalles de Pago Específico</s-link>
        <s-link href="/app/settings">Configuracion</s-link>
        <s-link href="/app/additional">Additional page</s-link>
      </s-app-nav>

      {/* All child routes will render here and can access customers via useRouteLoaderData */}
      <Outlet />
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