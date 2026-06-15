import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import { getAccessTokenForShop } from "../lib/auth.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const accessToken = await getAccessTokenForShop(session.shop);
  if (!accessToken) return Response.json({ error: "Token no disponible" }, { status: 401 });

  const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";
  try {
    const res = await fetch(`${BACKEND_URL}/api/audit/notifications`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      return Response.json({ error: "Error al obtener notificaciones" }, { status: res.status });
    }
    const data = await res.json();
    return Response.json(data);
  } catch (e) {
    return Response.json({ error: "Error de conexión" }, { status: 500 });
  }
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const accessToken = await getAccessTokenForShop(session.shop);
  if (!accessToken) return Response.json({ error: "Token no disponible" }, { status: 401 });

  const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "read_all") {
    try {
      const res = await fetch(`${BACKEND_URL}/api/audit/notifications/read-all`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) return Response.json({ error: "Error" }, { status: res.status });
      return Response.json({ success: true });
    } catch (e) {
      return Response.json({ error: "Error de conexión" }, { status: 500 });
    }
  }

  if (intent === "read") {
    const id = formData.get("id");
    try {
      const res = await fetch(`${BACKEND_URL}/api/audit/notifications/${id}/read`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) return Response.json({ error: "Error" }, { status: res.status });
      return Response.json({ success: true });
    } catch (e) {
      return Response.json({ error: "Error de conexión" }, { status: 500 });
    }
  }

  return Response.json({ error: "Intent inválido" }, { status: 400 });
};
