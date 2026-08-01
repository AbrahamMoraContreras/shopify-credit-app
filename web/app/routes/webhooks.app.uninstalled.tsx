import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";

/**
 * Shopify APP_UNINSTALLED webhook.
 * Clears local OAuth sessions so a reinstall starts clean.
 */
export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, topic } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);

  // Webhooks can fire more than once after uninstall; wipe any leftover sessions.
  await db.session.deleteMany({ where: { shop } });

  return new Response();
};
