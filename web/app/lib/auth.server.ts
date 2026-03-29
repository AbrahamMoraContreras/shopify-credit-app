import { redirect } from "react-router";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";
const INTERNAL_AUTH_SECRET = process.env.INTERNAL_AUTH_SECRET || "adiel2001";

interface TokenCache {
    token: string;
    expiresAt: number; // timestamp en ms
}
const tokenCacheMap = new Map<string, TokenCache>();

export async function getAccessToken(request: Request): Promise<string | null> {
    const cookieHeader = request.headers.get("Cookie");
    if (!cookieHeader) return null;

    try {
        const res = await fetch(`${BACKEND_URL}/api/merchants/refresh`, {
            method: "POST",
            headers: {
                "Cookie": cookieHeader,
                "Content-Type": "application/json"
            },
        });

        if (res.ok) {
            const data = await res.json();
            return data.access_token;
        }
    } catch (err) {
        console.error("Failed to refresh token in server:", err);
    }
    return null;
}

export async function getAccessTokenForShop(shop: string): Promise<string | null> {
    const now = Date.now();
    const cached = tokenCacheMap.get(shop);

    // Devolvemos token cacheado si está vivo y tiene al menos 5 minutos de holgura
    if (cached && cached.expiresAt > now + 300000) {
        return cached.token;
    }

    try {
        const res = await fetch(`${BACKEND_URL}/api/merchants/register`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-Internal-Secret": INTERNAL_AUTH_SECRET
            },
            body: JSON.stringify({ shop_domain: shop }),
        });

        if (res.ok) {
            const data = await res.json();
            // Cachear token por casi 24h (23h = 82800000 ms)
            tokenCacheMap.set(shop, {
                token: data.access_token,
                expiresAt: now + 82800000
            });
            return data.access_token;
        }
        console.error(`[auth.server] Falló el registro para la tienda ${shop}, status: ${res.status}`);
    } catch (err) {
        console.error(`[auth.server] Error al contactar FastAPI para ${shop}:`, err);
    }
    return null;
}

export async function requireAccessToken(request: Request): Promise<string> {
    const token = await getAccessToken(request);
    if (!token) {
        throw redirect("/app"); // Fallback or force re-registration
    }
    return token;
}
