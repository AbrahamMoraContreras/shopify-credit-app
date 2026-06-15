var _a;
import { jsx, jsxs, Fragment } from "react/jsx-runtime";
import { PassThrough } from "stream";
import { renderToPipeableStream } from "react-dom/server";
import { ServerRouter, UNSAFE_withComponentProps, Meta, Links, Outlet, ScrollRestoration, Scripts, useLoaderData, useActionData, Form, redirect, useSearchParams, UNSAFE_withErrorBoundaryProps, useRouteError, useNavigation, useSubmit, isRouteErrorResponse, useFetcher } from "react-router";
import { createReadableStreamFromReadable } from "@react-router/node";
import { isbot } from "isbot";
import "@shopify/shopify-app-react-router/adapters/node";
import { shopifyApp, AppDistribution, ApiVersion, LoginErrorType, boundary } from "@shopify/shopify-app-react-router/server";
import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma";
import { PrismaClient } from "@prisma/client";
import { AppProvider } from "@shopify/shopify-app-react-router/react";
import { useState, useEffect, useMemo, useRef } from "react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { redirect as redirect$1 } from "@remix-run/node";
if (process.env.NODE_ENV !== "production") {
  if (!global.prismaGlobal) {
    global.prismaGlobal = new PrismaClient();
  }
}
const prisma = global.prismaGlobal ?? new PrismaClient();
const shopify = shopifyApp({
  apiKey: process.env.SHOPIFY_API_KEY || "",
  apiSecretKey: process.env.SHOPIFY_API_SECRET || (() => {
    throw new Error("SHOPIFY_API_SECRET is not set in environment variables");
  })(),
  apiVersion: ApiVersion.October25,
  scopes: (_a = process.env.SCOPES) == null ? void 0 : _a.split(","),
  appUrl: process.env.SHOPIFY_APP_URL || "",
  authPathPrefix: "/auth",
  sessionStorage: new PrismaSessionStorage(prisma),
  distribution: AppDistribution.AppStore,
  future: {
    expiringOfflineAccessTokens: true
  },
  hooks: {
    afterAuth: async ({ session }) => {
      shopify.registerWebhooks({ session });
    }
  },
  ...process.env.SHOP_CUSTOM_DOMAIN ? { customShopDomains: [process.env.SHOP_CUSTOM_DOMAIN] } : {}
});
ApiVersion.October25;
const addDocumentResponseHeaders = shopify.addDocumentResponseHeaders;
const authenticate = shopify.authenticate;
shopify.unauthenticated;
const login = shopify.login;
shopify.registerWebhooks;
shopify.sessionStorage;
const streamTimeout = 5e3;
async function handleRequest(request, responseStatusCode, responseHeaders, reactRouterContext) {
  addDocumentResponseHeaders(request, responseHeaders);
  const userAgent = request.headers.get("user-agent");
  const callbackName = isbot(userAgent ?? "") ? "onAllReady" : "onShellReady";
  return new Promise((resolve, reject) => {
    const { pipe, abort } = renderToPipeableStream(
      /* @__PURE__ */ jsx(ServerRouter, { context: reactRouterContext, url: request.url }),
      {
        [callbackName]: () => {
          const body = new PassThrough();
          const stream = createReadableStreamFromReadable(body);
          responseHeaders.set("Content-Type", "text/html");
          resolve(
            new Response(stream, {
              headers: responseHeaders,
              status: responseStatusCode
            })
          );
          pipe(body);
        },
        onShellError(error) {
          reject(error);
        },
        onError(error) {
          responseStatusCode = 500;
          console.error(error);
        }
      }
    );
    setTimeout(abort, streamTimeout + 1e3);
  });
}
const entryServer = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: handleRequest,
  streamTimeout
}, Symbol.toStringTag, { value: "Module" }));
const root = UNSAFE_withComponentProps(function App() {
  return /* @__PURE__ */ jsxs("html", {
    lang: "en",
    suppressHydrationWarning: true,
    children: [/* @__PURE__ */ jsxs("head", {
      children: [/* @__PURE__ */ jsx("meta", {
        charSet: "utf-8"
      }), /* @__PURE__ */ jsx("meta", {
        name: "viewport",
        content: "width=device-width,initial-scale=1"
      }), /* @__PURE__ */ jsx("link", {
        rel: "preconnect",
        href: "https://cdn.shopify.com/"
      }), /* @__PURE__ */ jsx("link", {
        rel: "stylesheet",
        href: "https://cdn.shopify.com/static/fonts/inter/v4/styles.css"
      }), /* @__PURE__ */ jsx(Meta, {}), /* @__PURE__ */ jsx(Links, {})]
    }), /* @__PURE__ */ jsxs("body", {
      children: [/* @__PURE__ */ jsx(Outlet, {}), /* @__PURE__ */ jsx(ScrollRestoration, {}), /* @__PURE__ */ jsx(Scripts, {})]
    })]
  });
});
const route0 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: root
}, Symbol.toStringTag, { value: "Module" }));
function loginErrorMessage(loginErrors) {
  if ((loginErrors == null ? void 0 : loginErrors.shop) === LoginErrorType.MissingShop) {
    return { shop: "Please enter your shop domain to log in" };
  } else if ((loginErrors == null ? void 0 : loginErrors.shop) === LoginErrorType.InvalidShop) {
    return { shop: "Please enter a valid shop domain to log in" };
  }
  return {};
}
const loader$g = async ({
  request
}) => {
  const errors = loginErrorMessage(await login(request));
  return {
    errors
  };
};
const action$c = async ({
  request
}) => {
  const errors = loginErrorMessage(await login(request));
  return {
    errors
  };
};
const route$1 = UNSAFE_withComponentProps(function Auth() {
  const loaderData = useLoaderData();
  const actionData = useActionData();
  const [shop, setShop] = useState("");
  const {
    errors
  } = actionData || loaderData;
  return /* @__PURE__ */ jsx(AppProvider, {
    embedded: false,
    children: /* @__PURE__ */ jsx("s-page", {
      children: /* @__PURE__ */ jsx(Form, {
        method: "post",
        children: /* @__PURE__ */ jsxs("s-section", {
          heading: "Log in",
          children: [/* @__PURE__ */ jsx("s-text-field", {
            name: "shop",
            label: "Shop domain",
            details: "example.myshopify.com",
            value: shop,
            onChange: (e) => setShop(e.currentTarget.value),
            autocomplete: "on",
            error: errors.shop
          }), /* @__PURE__ */ jsx("s-button", {
            type: "submit",
            accessibilityLabel: "Iniciar sesión con tu tienda",
            children: "Log in"
          })]
        })
      })
    })
  });
});
const route1 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$c,
  default: route$1,
  loader: loader$g
}, Symbol.toStringTag, { value: "Module" }));
const loader$f = async ({
  request
}) => {
  await authenticate.admin(request);
  return null;
};
const action$b = async ({
  request
}) => {
  await authenticate.admin(request);
  return null;
};
const route2 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$b,
  loader: loader$f
}, Symbol.toStringTag, { value: "Module" }));
const index = "_index_1hqgz_1";
const heading = "_heading_1hqgz_21";
const text = "_text_1hqgz_23";
const content = "_content_1hqgz_43";
const form = "_form_1hqgz_53";
const label = "_label_1hqgz_69";
const input = "_input_1hqgz_85";
const button = "_button_1hqgz_93";
const list = "_list_1hqgz_101";
const styles$1 = {
  index,
  heading,
  text,
  content,
  form,
  label,
  input,
  button,
  list
};
const loader$e = async ({
  request
}) => {
  const url = new URL(request.url);
  if (url.searchParams.get("shop")) {
    throw redirect(`/app?${url.searchParams.toString()}`);
  }
  return {
    showForm: Boolean(login)
  };
};
const route = UNSAFE_withComponentProps(function App2() {
  const {
    showForm
  } = useLoaderData();
  return /* @__PURE__ */ jsx("div", {
    className: styles$1.index,
    children: /* @__PURE__ */ jsxs("div", {
      className: styles$1.content,
      children: [/* @__PURE__ */ jsx("h1", {
        className: styles$1.heading,
        children: "A short heading about [your app]"
      }), /* @__PURE__ */ jsx("p", {
        className: styles$1.text,
        children: "A tagline about [your app] that describes your value proposition."
      }), showForm && /* @__PURE__ */ jsxs(Form, {
        className: styles$1.form,
        method: "post",
        action: "/auth/login",
        children: [/* @__PURE__ */ jsxs("label", {
          className: styles$1.label,
          children: [/* @__PURE__ */ jsx("span", {
            children: "Shop domain"
          }), /* @__PURE__ */ jsx("input", {
            className: styles$1.input,
            type: "text",
            name: "shop"
          }), /* @__PURE__ */ jsx("span", {
            children: "e.g: my-shop-domain.myshopify.com"
          })]
        }), /* @__PURE__ */ jsx("button", {
          className: styles$1.button,
          type: "submit",
          children: "Log in"
        })]
      }), /* @__PURE__ */ jsxs("ul", {
        className: styles$1.list,
        children: [/* @__PURE__ */ jsxs("li", {
          children: [/* @__PURE__ */ jsx("strong", {
            children: "Product feature"
          }), ". Some detail about your feature and its benefit to your customer."]
        }), /* @__PURE__ */ jsxs("li", {
          children: [/* @__PURE__ */ jsx("strong", {
            children: "Product feature"
          }), ". Some detail about your feature and its benefit to your customer."]
        }), /* @__PURE__ */ jsxs("li", {
          children: [/* @__PURE__ */ jsx("strong", {
            children: "Product feature"
          }), ". Some detail about your feature and its benefit to your customer."]
        })]
      })]
    })
  });
});
const route3 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: route,
  loader: loader$e
}, Symbol.toStringTag, { value: "Module" }));
const SPREADSHEET_CSV_URL$1 = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQqrzXGB4grT2FhonRlj3jZVC3E9sSaZl9gkgd0nSrwtA55E_Fcy7Q3QDCO8lTMlDS_D21wgDGaXJ1x/pub?output=csv";
const loader$d = async () => {
  let tasaBcv = null;
  let tasaFecha = null;
  try {
    const csvRes = await fetch(SPREADSHEET_CSV_URL$1);
    if (csvRes.ok) {
      const text2 = await csvRes.text();
      const lines = text2.trim().split("\n").filter((l) => l.trim());
      const lastLine = lines[lines.length - 1];
      const match = lastLine.match(/"([\d.,]+)\s*Bs\."/);
      if (match) {
        tasaBcv = parseFloat(match[1].replace(".", "").replace(",", "."));
      }
      const dateMatch = lastLine.match(/(\d{1,2}\/\d{2}\/\d{4})/);
      if (dateMatch) {
        tasaFecha = dateMatch[1];
      }
    }
  } catch (e) {
    console.error("[pago] Failed to fetch BCV rate:", e);
  }
  return {
    BACKEND_URL: process.env.BACKEND_URL || "http://localhost:8000",
    tasaBcv,
    tasaFecha
  };
};
const VENEZUELAN_BANKS$1 = ["(0102) BANCO DE VENEZUELA, S.A. BANCO UNIVERSAL", "(0104) BANCO VENEZOLANO DE CRÉDITO, S.A BANCO UNIVERSAL", "(0105) BANCO MERCANTIL C.A., BANCO UNIVERSAL", "(0108) BANCO PROVINCIAL, S.A. BANCO UNIVERSAL", "(0134) BANESCO BANCO UNIVERSAL, C.A.", "(0172) BANCAMIGA BANCO UNIVERSAL, C.A.", "(0174) BANPLUS BANCO UNIVERSAL, C.A.", "(0191) BANCO NACIONAL DE CRÉDITO C.A., BANCO UNIVERSAL", "Otro"];
const pago = UNSAFE_withComponentProps(function PagoPublico() {
  const [searchParams] = useSearchParams();
  const {
    BACKEND_URL: BACKEND_URL2,
    tasaBcv,
    tasaFecha
  } = useLoaderData();
  const API = `${BACKEND_URL2}/api`;
  const token = searchParams.get("token") ?? "";
  const [info, setInfo] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [form2, setForm] = useState({
    bank_name: VENEZUELAN_BANKS$1[0],
    reference_number: "",
    amount: "",
    notes: ""
  });
  const [sending, setSending] = useState(false);
  const [formError, setFormError] = useState("");
  const [manualTasa, setManualTasa] = useState("");
  useEffect(() => {
    if (!token) {
      setError("Enlace inválido. No se encontró el token de verificación.");
      setLoading(false);
      return;
    }
    fetch(`${API}/public/payment-info?token=${token}`).then(async (r) => {
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.detail ?? `Error ${r.status}`);
      }
      return r.json();
    }).then((data) => {
      setInfo(data);
      setForm((f) => ({
        ...f,
        amount: String(data.amount)
      }));
    }).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }, [token]);
  const isVesMethod = !!((info == null ? void 0 : info.pago_movil) || (info == null ? void 0 : info.transferencia));
  const effectiveTasa = tasaBcv ?? (manualTasa && !isNaN(Number(manualTasa)) ? Number(manualTasa) : null);
  const tasaSource = tasaBcv ? "auto" : "manual";
  const montoUsd = info ? Number(info.amount) : 0;
  const montoVes = effectiveTasa && montoUsd ? montoUsd * effectiveTasa : null;
  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");
    if (!form2.reference_number.trim()) {
      setFormError("El número de referencia es obligatorio.");
      return;
    }
    if (!form2.amount || isNaN(Number(form2.amount))) {
      setFormError("Ingresa un monto válido.");
      return;
    }
    let finalNotes = form2.notes;
    if (isVesMethod && effectiveTasa && montoVes) {
      const sourceLabel = tasaSource === "auto" ? `Fecha tasa: ${tasaFecha || "hoy"}` : "Tasa ingresada manualmente";
      const conversionNote = `[Conversión BCV] Tasa: ${effectiveTasa.toFixed(2)} Bs/USD | Equivalente: Bs. ${montoVes.toFixed(2)} (${sourceLabel})`;
      finalNotes = finalNotes ? `${finalNotes}
${conversionNote}` : conversionNote;
    }
    setSending(true);
    try {
      const res = await fetch(`${API}/public/payment-proof`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          token,
          ...form2,
          notes: finalNotes,
          amount: parseFloat(form2.amount)
        })
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setFormError(d.detail ?? "Error al enviar el comprobante.");
      } else {
        setSubmitted(true);
      }
    } catch {
      setFormError("Error de conexión. Intenta de nuevo.");
    } finally {
      setSending(false);
    }
  };
  if (loading) return /* @__PURE__ */ jsx("div", {
    style: styles.page,
    children: /* @__PURE__ */ jsx("div", {
      style: styles.card,
      children: /* @__PURE__ */ jsx("p", {
        style: styles.sub,
        children: "Cargando información de tu pago..."
      })
    })
  });
  if (error) return /* @__PURE__ */ jsx("div", {
    style: styles.page,
    children: /* @__PURE__ */ jsxs("div", {
      style: styles.card,
      children: [/* @__PURE__ */ jsx("h2", {
        style: {
          ...styles.title,
          color: "#e53e3e"
        },
        children: "Enlace inválido"
      }), /* @__PURE__ */ jsx("p", {
        style: styles.sub,
        children: error
      })]
    })
  });
  if (submitted) return /* @__PURE__ */ jsx("div", {
    style: styles.page,
    children: /* @__PURE__ */ jsxs("div", {
      style: styles.card,
      children: [/* @__PURE__ */ jsx("div", {
        style: {
          fontSize: 48,
          textAlign: "center"
        },
        children: "✅"
      }), /* @__PURE__ */ jsx("h2", {
        style: {
          ...styles.title,
          color: "#38a169"
        },
        children: "¡Comprobante enviado!"
      }), /* @__PURE__ */ jsx("p", {
        style: styles.sub,
        children: "Hemos recibido tu información de pago. Nuestro equipo la revisará próximamente."
      })]
    })
  });
  return /* @__PURE__ */ jsx("div", {
    style: styles.page,
    children: /* @__PURE__ */ jsxs("div", {
      style: styles.card,
      children: [/* @__PURE__ */ jsx("h1", {
        style: styles.title,
        children: "Confirmación de Pago"
      }), info && /* @__PURE__ */ jsxs("div", {
        style: styles.infoBox,
        children: [/* @__PURE__ */ jsxs("p", {
          style: styles.sub,
          children: [/* @__PURE__ */ jsx("strong", {
            children: "Cliente:"
          }), " ", info.customer_name]
        }), info.installment_number && /* @__PURE__ */ jsxs("p", {
          style: styles.sub,
          children: [/* @__PURE__ */ jsx("strong", {
            children: "Cuota:"
          }), " #", info.installment_number]
        }), /* @__PURE__ */ jsxs("p", {
          style: styles.sub,
          children: [/* @__PURE__ */ jsx("strong", {
            children: "Monto esperado:"
          }), " ", /* @__PURE__ */ jsxs("span", {
            style: {
              color: "#5C6AC4",
              fontWeight: "bold"
            },
            children: ["$", Number(info.amount).toFixed(2), " USD"]
          })]
        }), isVesMethod && effectiveTasa && montoVes && /* @__PURE__ */ jsxs("div", {
          style: styles.conversionBox,
          children: [/* @__PURE__ */ jsx("p", {
            style: styles.conversionTitle,
            children: "💱 Equivalente en Bolívares (Tasa BCV)"
          }), /* @__PURE__ */ jsxs("p", {
            style: styles.conversionAmount,
            children: ["Bs. ", montoVes.toFixed(2)]
          }), /* @__PURE__ */ jsxs("p", {
            style: styles.conversionRate,
            children: ["Tasa oficial: ", /* @__PURE__ */ jsxs("strong", {
              children: ["Bs. ", effectiveTasa.toFixed(2)]
            }), " por USD", tasaSource === "auto" && tasaFecha && /* @__PURE__ */ jsxs("span", {
              children: [" — Actualizada: ", tasaFecha]
            }), tasaSource === "manual" && /* @__PURE__ */ jsx("span", {
              children: " — (ingresada manualmente)"
            })]
          })]
        }), isVesMethod && !tasaBcv && /* @__PURE__ */ jsxs("div", {
          style: styles.manualRateBox,
          children: [/* @__PURE__ */ jsx("p", {
            style: styles.manualRateWarning,
            children: "⚠️ No se pudo obtener la tasa BCV automáticamente."
          }), /* @__PURE__ */ jsx("label", {
            style: styles.label,
            children: "Ingresa la tasa de cambio manualmente (Bs/USD):"
          }), /* @__PURE__ */ jsx("input", {
            style: styles.input,
            type: "number",
            step: "0.01",
            value: manualTasa,
            onChange: (e) => setManualTasa(e.target.value),
            placeholder: "Ej: 526.87"
          })]
        })]
      }), (info == null ? void 0 : info.pago_movil) && /* @__PURE__ */ jsxs("div", {
        style: styles.methodBox,
        children: [/* @__PURE__ */ jsx("h3", {
          style: styles.methodTitle,
          children: "📱 Pago Móvil"
        }), /* @__PURE__ */ jsxs("p", {
          style: styles.methodLine,
          children: [/* @__PURE__ */ jsx("strong", {
            children: "Banco:"
          }), " ", info.pago_movil.banco]
        }), /* @__PURE__ */ jsxs("p", {
          style: styles.methodLine,
          children: [/* @__PURE__ */ jsx("strong", {
            children: "Teléfono:"
          }), " ", info.pago_movil.telefono]
        }), /* @__PURE__ */ jsxs("p", {
          style: styles.methodLine,
          children: [/* @__PURE__ */ jsx("strong", {
            children: "Documento:"
          }), " ", info.pago_movil.tipoCi, "-", info.pago_movil.ci]
        }), effectiveTasa && montoVes && /* @__PURE__ */ jsxs("p", {
          style: {
            ...styles.methodLine,
            marginTop: 8,
            fontWeight: 600,
            color: "#2B6CB0"
          },
          children: ["Monto a enviar: Bs. ", montoVes.toFixed(2)]
        })]
      }), (info == null ? void 0 : info.transferencia) && /* @__PURE__ */ jsxs("div", {
        style: styles.methodBox,
        children: [/* @__PURE__ */ jsx("h3", {
          style: styles.methodTitle,
          children: "🏦 Transferencia Bancaria"
        }), /* @__PURE__ */ jsxs("p", {
          style: styles.methodLine,
          children: [/* @__PURE__ */ jsx("strong", {
            children: "Banco:"
          }), " ", info.transferencia.banco]
        }), /* @__PURE__ */ jsxs("p", {
          style: styles.methodLine,
          children: [/* @__PURE__ */ jsx("strong", {
            children: "Cuenta:"
          }), " ", info.transferencia.numero]
        }), /* @__PURE__ */ jsxs("p", {
          style: styles.methodLine,
          children: [/* @__PURE__ */ jsx("strong", {
            children: "Documento:"
          }), " ", info.transferencia.tipoCi, "-", info.transferencia.ci]
        }), effectiveTasa && montoVes && /* @__PURE__ */ jsxs("p", {
          style: {
            ...styles.methodLine,
            marginTop: 8,
            fontWeight: 600,
            color: "#2B6CB0"
          },
          children: ["Monto a transferir: Bs. ", montoVes.toFixed(2)]
        })]
      }), /* @__PURE__ */ jsx("hr", {
        style: {
          margin: "24px 0",
          borderColor: "#E2E8F0"
        }
      }), /* @__PURE__ */ jsx("h2", {
        style: {
          ...styles.title,
          fontSize: 18
        },
        children: "Completa los datos de tu pago"
      }), /* @__PURE__ */ jsxs("form", {
        onSubmit: handleSubmit,
        style: styles.form,
        children: [/* @__PURE__ */ jsx("label", {
          style: styles.label,
          children: "Banco desde el que pago"
        }), /* @__PURE__ */ jsx("select", {
          style: styles.input,
          value: form2.bank_name,
          onChange: (e) => setForm({
            ...form2,
            bank_name: e.target.value
          }),
          children: VENEZUELAN_BANKS$1.map((b) => /* @__PURE__ */ jsx("option", {
            value: b,
            children: b
          }, b))
        }), /* @__PURE__ */ jsx("label", {
          style: styles.label,
          children: "Número de referencia / comprobante"
        }), /* @__PURE__ */ jsx("input", {
          style: styles.input,
          value: form2.reference_number,
          onChange: (e) => setForm({
            ...form2,
            reference_number: e.target.value
          }),
          placeholder: "Ej: 00234567890",
          required: true
        }), /* @__PURE__ */ jsx("label", {
          style: styles.label,
          children: "Monto transferido (USD)"
        }), /* @__PURE__ */ jsx("input", {
          style: styles.input,
          type: "number",
          step: "0.01",
          value: form2.amount,
          onChange: (e) => setForm({
            ...form2,
            amount: e.target.value
          }),
          placeholder: "0.00",
          required: true
        }), isVesMethod && effectiveTasa && form2.amount && !isNaN(Number(form2.amount)) && /* @__PURE__ */ jsxs("div", {
          style: styles.vesHint,
          children: ["Equivale a ", /* @__PURE__ */ jsxs("strong", {
            children: ["Bs. ", (Number(form2.amount) * effectiveTasa).toFixed(2)]
          }), " a la tasa BCV de hoy"]
        }), /* @__PURE__ */ jsx("label", {
          style: styles.label,
          children: "Notas adicionales (opcional)"
        }), /* @__PURE__ */ jsx("textarea", {
          style: {
            ...styles.input,
            height: 72
          },
          value: form2.notes,
          onChange: (e) => setForm({
            ...form2,
            notes: e.target.value
          }),
          placeholder: "Cualquier información relevante..."
        }), formError && /* @__PURE__ */ jsx("p", {
          style: {
            color: "#e53e3e",
            fontSize: 14
          },
          children: formError
        }), /* @__PURE__ */ jsx("button", {
          type: "submit",
          style: styles.button,
          disabled: sending,
          children: sending ? "Enviando..." : "Confirmar Pago"
        })]
      })]
    })
  });
});
const styles = {
  page: {
    minHeight: "100vh",
    background: "#F7FAFC",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "24px",
    fontFamily: "Inter, system-ui, sans-serif"
  },
  card: {
    background: "#fff",
    borderRadius: 12,
    boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
    padding: "36px",
    maxWidth: 520,
    width: "100%"
  },
  title: {
    fontSize: 22,
    fontWeight: 700,
    color: "#1A202C",
    marginBottom: 4
  },
  sub: {
    color: "#718096",
    margin: "4px 0",
    fontSize: 14
  },
  infoBox: {
    background: "#EBF4FF",
    borderRadius: 8,
    padding: "12px 16px",
    marginBottom: 16
  },
  methodBox: {
    background: "#F7FAFC",
    border: "1px solid #E2E8F0",
    borderRadius: 8,
    padding: "12px 16px",
    marginBottom: 12
  },
  methodTitle: {
    fontSize: 15,
    fontWeight: 600,
    color: "#2D3748",
    marginBottom: 4
  },
  methodLine: {
    fontSize: 13,
    color: "#4A5568",
    margin: "2px 0"
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: 12
  },
  label: {
    fontSize: 13,
    fontWeight: 600,
    color: "#4A5568"
  },
  input: {
    padding: "10px 12px",
    borderRadius: 6,
    border: "1px solid #CBD5E0",
    fontSize: 14,
    width: "100%",
    boxSizing: "border-box",
    outline: "none"
  },
  button: {
    marginTop: 8,
    background: "#5C6AC4",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    padding: "12px 0",
    fontSize: 16,
    fontWeight: 700,
    cursor: "pointer",
    transition: "background 0.2s"
  },
  conversionBox: {
    background: "#FFFBEB",
    border: "1px solid #F6E05E",
    borderRadius: 8,
    padding: "12px 16px",
    marginTop: 12
  },
  conversionTitle: {
    fontSize: 13,
    fontWeight: 600,
    color: "#975A16",
    margin: "0 0 4px"
  },
  conversionAmount: {
    fontSize: 24,
    fontWeight: 700,
    color: "#B7791F",
    margin: "4px 0"
  },
  conversionRate: {
    fontSize: 12,
    color: "#975A16",
    margin: 0
  },
  vesHint: {
    background: "#FFFBEB",
    border: "1px solid #F6E05E",
    borderRadius: 6,
    padding: "8px 12px",
    fontSize: 13,
    color: "#975A16"
  },
  manualRateBox: {
    background: "#FFF5F5",
    border: "1px solid #FEB2B2",
    borderRadius: 8,
    padding: "12px 16px",
    marginTop: 12,
    display: "flex",
    flexDirection: "column",
    gap: 8
  },
  manualRateWarning: {
    fontSize: 13,
    fontWeight: 600,
    color: "#C53030",
    margin: 0
  }
};
const route4 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: pago,
  loader: loader$d
}, Symbol.toStringTag, { value: "Module" }));
const BACKEND_URL$1 = process.env.BACKEND_URL || "http://localhost:8000";
const INTERNAL_AUTH_SECRET = process.env.INTERNAL_AUTH_SECRET || "adiel2001";
const tokenCacheMap = /* @__PURE__ */ new Map();
async function getAccessTokenForShop(shop) {
  const now = Date.now();
  const cached = tokenCacheMap.get(shop);
  if (cached && cached.expiresAt > now + 3e5) {
    return cached.token;
  }
  try {
    const res = await fetch(`${BACKEND_URL$1}/api/merchants/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Internal-Secret": INTERNAL_AUTH_SECRET
      },
      body: JSON.stringify({ shop_domain: shop })
    });
    if (res.ok) {
      const data = await res.json();
      tokenCacheMap.set(shop, {
        token: data.access_token,
        expiresAt: now + 828e5
      });
      return data.access_token;
    }
    console.error(`[auth.server] Falló el registro para la tienda ${shop}, status: ${res.status}`);
  } catch (err) {
    console.error(`[auth.server] Error al contactar FastAPI para ${shop}:`, err);
  }
  return null;
}
function isDocumentRequest$1(request) {
  const accept = request.headers.get("Accept") || "";
  const xrw = request.headers.get("X-Requested-With") || "";
  return accept.includes("text/html") && xrw !== "XMLHttpRequest";
}
const loader$c = async ({
  request
}) => {
  let session;
  try {
    ({
      session
    } = await authenticate.admin(request));
  } catch (error) {
    if (error instanceof Response && error.status === 401 && isDocumentRequest$1(request)) {
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
    accessToken
  };
};
function NotificationsBell() {
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const fetchNotifications = async () => {
    try {
      const res = await fetch("/app/notifications");
      if (res.ok) {
        const data = await res.json();
        setNotifications(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error("Error fetching notifications:", e);
    }
  };
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15e3);
    return () => clearInterval(interval);
  }, []);
  const unreadCount = notifications.filter((n) => {
    var _a2;
    return !((_a2 = n.changes) == null ? void 0 : _a2.is_read);
  }).length;
  const markAsRead = async (id) => {
    try {
      const formData = new FormData();
      formData.append("intent", "read");
      formData.append("id", String(id));
      const res = await fetch("/app/notifications", {
        method: "POST",
        body: formData
      });
      if (res.ok) {
        setNotifications((prev) => prev.map((n) => n.id === id ? {
          ...n,
          changes: {
            ...n.changes,
            is_read: true
          }
        } : n));
      }
    } catch (e) {
      console.error(e);
    }
  };
  const markAllAsRead = async () => {
    try {
      const formData = new FormData();
      formData.append("intent", "read_all");
      const res = await fetch("/app/notifications", {
        method: "POST",
        body: formData
      });
      if (res.ok) {
        setNotifications((prev) => prev.map((n) => ({
          ...n,
          changes: {
            ...n.changes,
            is_read: true
          }
        })));
      }
    } catch (e) {
      console.error(e);
    }
  };
  return /* @__PURE__ */ jsxs("div", {
    style: {
      position: "fixed",
      bottom: "20px",
      right: "20px",
      zIndex: 9999
    },
    children: [/* @__PURE__ */ jsxs("button", {
      onClick: () => setIsOpen(!isOpen),
      style: {
        width: "56px",
        height: "56px",
        borderRadius: "50%",
        backgroundColor: "#008060",
        // Shopify green
        color: "white",
        border: "none",
        cursor: "pointer",
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        outline: "none",
        transition: "transform 0.2s"
      },
      onMouseEnter: (e) => e.currentTarget.style.transform = "scale(1.05)",
      onMouseLeave: (e) => e.currentTarget.style.transform = "scale(1)",
      children: [/* @__PURE__ */ jsxs("svg", {
        xmlns: "http://www.w3.org/2000/svg",
        viewBox: "0 0 24 24",
        fill: "none",
        stroke: "currentColor",
        strokeWidth: "2",
        strokeLinecap: "round",
        strokeLinejoin: "round",
        style: {
          width: "24px",
          height: "24px"
        },
        children: [/* @__PURE__ */ jsx("path", {
          d: "M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"
        }), /* @__PURE__ */ jsx("path", {
          d: "M13.73 21a2 2 0 0 1-3.46 0"
        })]
      }), unreadCount > 0 && /* @__PURE__ */ jsx("span", {
        style: {
          position: "absolute",
          top: "-2px",
          right: "-2px",
          backgroundColor: "#d82c0d",
          // Polaris critical red
          color: "white",
          borderRadius: "50%",
          width: "20px",
          height: "20px",
          fontSize: "12px",
          fontWeight: "bold",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 2px 4px rgba(0,0,0,0.2)"
        },
        children: unreadCount
      })]
    }), isOpen && /* @__PURE__ */ jsxs("div", {
      style: {
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
        flexDirection: "column"
      },
      children: [/* @__PURE__ */ jsxs("div", {
        style: {
          padding: "12px 16px",
          borderBottom: "1px solid #e1e3e5",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          backgroundColor: "#f6f6f7"
        },
        children: [/* @__PURE__ */ jsx("span", {
          style: {
            fontWeight: 600,
            fontSize: "14px",
            color: "#202223"
          },
          children: "Notificaciones"
        }), unreadCount > 0 && /* @__PURE__ */ jsx("button", {
          onClick: markAllAsRead,
          style: {
            background: "none",
            border: "none",
            color: "#008060",
            cursor: "pointer",
            fontSize: "12px",
            fontWeight: 500,
            padding: 0
          },
          children: "Marcar todo como leído"
        })]
      }), /* @__PURE__ */ jsx("div", {
        style: {
          overflowY: "auto",
          flex: 1
        },
        children: notifications.length === 0 ? /* @__PURE__ */ jsx("div", {
          style: {
            padding: "32px 16px",
            textAlign: "center",
            color: "#6d7175"
          },
          children: "No tienes notificaciones"
        }) : notifications.map((n) => {
          var _a2, _b, _c;
          const isRead = (_a2 = n.changes) == null ? void 0 : _a2.is_read;
          const paymentId = (_b = n.changes) == null ? void 0 : _b.payment_id;
          return /* @__PURE__ */ jsxs("div", {
            onClick: () => {
              if (!isRead) markAsRead(n.id);
            },
            style: {
              padding: "12px 16px",
              borderBottom: "1px solid #f1f2f4",
              backgroundColor: isRead ? "white" : "#f1f8f5",
              cursor: "pointer",
              transition: "background-color 0.1s",
              display: "flex",
              flexDirection: "column",
              gap: "4px"
            },
            children: [/* @__PURE__ */ jsx("div", {
              style: {
                fontSize: "13px",
                color: "#202223",
                lineHeight: "1.4",
                textAlign: "left"
              },
              children: (_c = n.changes) == null ? void 0 : _c.message
            }), /* @__PURE__ */ jsxs("div", {
              style: {
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center"
              },
              children: [/* @__PURE__ */ jsx("span", {
                style: {
                  fontSize: "11px",
                  color: "#6d7175"
                },
                children: new Date(n.timestamp).toLocaleDateString("es-ES", {
                  hour: "2-digit",
                  minute: "2-digit"
                })
              }), paymentId && /* @__PURE__ */ jsx("a", {
                href: `/app/payment_detail/${paymentId}`,
                style: {
                  fontSize: "11px",
                  color: "#008060",
                  textDecoration: "none",
                  fontWeight: 500
                },
                onClick: (e) => e.stopPropagation(),
                children: "Ver Pago →"
              })]
            })]
          }, n.id);
        })
      })]
    })]
  });
}
const app = UNSAFE_withComponentProps(function App3() {
  const {
    apiKey,
    shopDomain,
    accessToken
  } = useLoaderData();
  return /* @__PURE__ */ jsxs(AppProvider, {
    embedded: true,
    apiKey,
    children: [/* @__PURE__ */ jsxs("ui-nav-menu", {
      children: [/* @__PURE__ */ jsx("s-link", {
        href: "/app",
        children: "Home"
      }), /* @__PURE__ */ jsx("s-link", {
        href: "/app/shopify_customers",
        children: "Clientes Shopify"
      }), /* @__PURE__ */ jsx("s-link", {
        href: "/app/credits",
        children: "Creditos"
      }), /* @__PURE__ */ jsx("s-link", {
        href: "/app/registre_credit",
        children: "Registrar Crédito"
      }), /* @__PURE__ */ jsx("s-link", {
        href: "/app/payments",
        children: "Pagos"
      }), /* @__PURE__ */ jsx("s-link", {
        href: "/app/expected_payments",
        children: "Pagos Esperados"
      }), /* @__PURE__ */ jsx("s-link", {
        href: "/app/registre_payment",
        children: "Registrar Pago"
      }), /* @__PURE__ */ jsx("s-link", {
        href: "/app/settings",
        children: "Configuracion"
      })]
    }), /* @__PURE__ */ jsx(Outlet, {
      context: {
        shopDomain,
        accessToken
      }
    }), /* @__PURE__ */ jsx(NotificationsBell, {})]
  });
});
const ErrorBoundary$2 = UNSAFE_withErrorBoundaryProps(function ErrorBoundary() {
  return boundary.error(useRouteError());
});
const headers$8 = (headersArgs) => {
  return boundary.headers(headersArgs);
};
const route5 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  ErrorBoundary: ErrorBoundary$2,
  default: app,
  headers: headers$8,
  loader: loader$c
}, Symbol.toStringTag, { value: "Module" }));
function ClientDate({ dateString, format = "date", fallback = "" }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  if (!mounted || !dateString) {
    return /* @__PURE__ */ jsx(Fragment, { children: fallback });
  }
  const d = new Date(dateString);
  return /* @__PURE__ */ jsx(Fragment, { children: format === "date" ? d.toLocaleDateString() : d.toLocaleString() });
}
const loader$b = async ({
  request,
  params
}) => {
  const {
    session
  } = await authenticate.admin(request);
  const accessToken = await getAccessTokenForShop(session.shop);
  if (!accessToken) throw new Error("Token no disponible");
  const shopifyCustomerId = params.id;
  const BACKEND_URL2 = process.env.BACKEND_URL || "http://localhost:8000";
  const custRes = await fetch(`${BACKEND_URL2}/api/customers?shopify_customer_id=${shopifyCustomerId}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });
  if (!custRes.ok) throw new Error("Error fetching customer");
  const customers = await custRes.json();
  const customer = customers.length > 0 ? customers[0] : null;
  if (!customer) throw new Error("Customer no encontrado en la base de datos interna");
  const creditsRes = await fetch(`${BACKEND_URL2}/api/credits?customer_id=${customer.id}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });
  const credits = creditsRes.ok ? await creditsRes.json() : [];
  const paymentsPromises = credits.map((c) => fetch(`${BACKEND_URL2}/api/credits/payments/by-credit/${c.id}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  }).then((res) => res.ok ? res.json() : []));
  const paymentsArrays = await Promise.all(paymentsPromises);
  const allPayments = paymentsArrays.flat();
  const balanceHistoryRes = await fetch(`${BACKEND_URL2}/api/audit/customer/${customer.id}/balance-history`, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });
  const balanceHistory = balanceHistoryRes.ok ? await balanceHistoryRes.json() : [];
  return {
    customer,
    credits,
    allPayments,
    shopifyCustomerId,
    balanceHistory
  };
};
const action$a = async ({
  request,
  params
}) => {
  const {
    session
  } = await authenticate.admin(request);
  const accessToken = await getAccessTokenForShop(session.shop);
  if (!accessToken) return {
    error: "Token no disponible"
  };
  const formData = await request.formData();
  const intent = formData.get("intent");
  const BACKEND_URL2 = process.env.BACKEND_URL || "http://localhost:8000";
  if (intent === "manage_balance") {
    const customerId = formData.get("customer_id");
    const amount = formData.get("amount");
    const actionType = formData.get("action_type");
    const reason = formData.get("reason");
    try {
      const res = await fetch(`${BACKEND_URL2}/api/customers/${customerId}/favorable-balance`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          amount: Number(amount),
          action: actionType,
          reason
        })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        return {
          error: err.detail || "Error al actualizar saldo"
        };
      }
      return {
        success: true
      };
    } catch (e) {
      return {
        error: "Error de conexión al actualizar saldo"
      };
    }
  }
  return null;
};
const app_customer_detail_$id = UNSAFE_withComponentProps(function CustomerDetail() {
  const {
    customer,
    credits,
    allPayments,
    shopifyCustomerId,
    balanceHistory
  } = useLoaderData();
  useNavigation();
  const actionData = useActionData();
  const [isBalanceModalOpen, setIsBalanceModalOpen] = useState(false);
  const [balanceForm, setBalanceForm] = useState({
    amount: "",
    action: "ADD",
    reason: ""
  });
  const submit = useSubmit();
  const operations = [];
  credits.forEach((c) => {
    operations.push({
      type: "credit",
      id: c.id,
      date: c.created_at,
      amount: c.total_amount,
      status: c.status,
      reference: c.invoice_code || `Credito #${c.id}`,
      label: "Crédito Solicitado",
      link: `/app/credit_detail/${c.id}`
    });
  });
  allPayments.forEach((p) => {
    operations.push({
      type: "payment",
      id: p.id,
      date: p.payment_date,
      amount: p.amount,
      status: p.status,
      reference: `Pago-Credito #${p.credit_id}: ${p.reference_number || "S/N"}`,
      label: "Abono Registrado",
      link: `/app/payment_detail/${p.id}`,
      punctuality_value: p.punctuality_value
    });
  });
  operations.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const totalDebt = credits.filter((c) => c.status !== "CANCELADO" && c.status !== "RECHAZADO").reduce((sum, c) => sum + Number(c.balance || 0), 0);
  const creditsCompleted = credits.filter((c) => c.status === "PAGADO").length;
  const creditsIncomplete = credits.filter((c) => ["PENDIENTE_ACTIVACION", "EMITIDO", "EN_PROGRESO", "MOROSO"].includes(c.status)).length;
  const paymentsOnTime = allPayments.filter((p) => p.status === "APROBADO" && p.punctuality_value != null && Number(p.punctuality_value) === 100).length;
  const paymentsLate = allPayments.filter((p) => p.status === "APROBADO" && p.punctuality_value != null && Number(p.punctuality_value) === 0).length;
  const reputationBadge = (label2) => {
    const config = {
      excelente: {
        tone: "success",
        emoji: "⭐",
        text: "Excelente"
      },
      buena: {
        tone: "info",
        emoji: "👍",
        text: "Buena"
      },
      regular: {
        tone: "attention",
        emoji: "⚠️",
        text: "Regular"
      },
      mala: {
        tone: "critical",
        emoji: "❌",
        text: "Mala"
      },
      sin_historial: {
        tone: "neutral",
        emoji: "—",
        text: "Sin historial"
      }
    };
    const c = config[label2 ?? "sin_historial"] ?? config["sin_historial"];
    return /* @__PURE__ */ jsxs("s-badge", {
      tone: c.tone,
      children: [c.emoji, " ", c.text]
    });
  };
  const handleExport = (format) => {
    var _a2;
    if (!format || !customer) return;
    const summaryHeader = [["Atributo", "Valor"]];
    const summaryData = [["Nombre", customer.full_name || ""], ["Email", customer.email || "Sin correo registrado"], ["ID Interno", ((_a2 = customer.id) == null ? void 0 : _a2.toString()) || ""], ["ID Shopify", (shopifyCustomerId == null ? void 0 : shopifyCustomerId.toString()) || ""], ["Deuda Total Pendiente", `$${totalDebt.toFixed(2)}`], ["Saldo a Favor", `$${Number(customer.favorable_balance || 0).toFixed(2)}`], ["Reputación", customer.reputation || "sin_historial"]];
    const operationsData = operations.map((op) => ({
      Fecha: new Date(op.date).toLocaleDateString(),
      "Tipo Operación": op.label,
      Referencia: op.reference,
      Monto: `$${Number(op.amount).toFixed(2)}`,
      Estatus: op.status
    }));
    if (format === "csv" || format === "xlsx") {
      const wb = XLSX.utils.book_new();
      const wsSummary = XLSX.utils.aoa_to_sheet([...summaryHeader, ...summaryData]);
      XLSX.utils.book_append_sheet(wb, wsSummary, "Resumen Cliente");
      if (operationsData.length > 0) {
        const wsOperations = XLSX.utils.json_to_sheet(operationsData);
        XLSX.utils.book_append_sheet(wb, wsOperations, "Historial Operaciones");
      }
      if (format === "csv") {
        const allData = [["--- Resumen Cliente ---"], ...summaryHeader, ...summaryData, [], ["--- Historial de Operaciones ---"], operationsData.length > 0 ? Object.keys(operationsData[0]) : [], ...operationsData.map(Object.values)];
        const wbCsv = XLSX.utils.book_new();
        const wsCombined = XLSX.utils.aoa_to_sheet(allData);
        XLSX.utils.book_append_sheet(wbCsv, wsCombined, "Export");
        XLSX.writeFile(wbCsv, `cliente_${customer.id}.csv`);
      } else {
        XLSX.writeFile(wb, `cliente_${customer.id}.xlsx`);
      }
    } else if (format === "pdf") {
      const doc = new jsPDF();
      doc.text(`Reporte de Cliente: ${customer.full_name}`, 14, 15);
      autoTable(doc, {
        startY: 20,
        head: summaryHeader,
        body: summaryData
      });
      const currentY = doc.lastAutoTable.finalY + 10;
      if (operationsData.length > 0) {
        doc.text("Historial de Operaciones Completas", 14, currentY);
        autoTable(doc, {
          startY: currentY + 5,
          head: [Object.keys(operationsData[0])],
          body: operationsData.map(Object.values)
        });
      }
      doc.save(`cliente_${customer.id}.pdf`);
    }
  };
  return /* @__PURE__ */ jsxs("s-page", {
    heading: "Detalles del Cliente",
    inlineSize: "large",
    children: [/* @__PURE__ */ jsxs("s-stack", {
      direction: "inline",
      gap: "small",
      alignItems: "center",
      slot: "primary-action",
      children: [/* @__PURE__ */ jsxs("s-select", {
        value: "",
        onChange: (e) => handleExport(e.target.value),
        children: [/* @__PURE__ */ jsx("s-option", {
          value: "",
          disabled: true,
          children: "Exportar Datos..."
        }), /* @__PURE__ */ jsx("s-option", {
          value: "csv",
          children: "Exportar a CSV"
        }), /* @__PURE__ */ jsx("s-option", {
          value: "xlsx",
          children: "Exportar a XLSX"
        }), /* @__PURE__ */ jsx("s-option", {
          value: "pdf",
          children: "Exportar a PDF"
        })]
      }), /* @__PURE__ */ jsx("s-button", {
        href: `shopify:admin/customers/${shopifyCustomerId}`,
        accessibilityLabel: "Ver en Shopify Administrador",
        children: "Ver en Shopify"
      })]
    }), /* @__PURE__ */ jsxs("s-stack", {
      gap: "base",
      children: [/* @__PURE__ */ jsx("s-grid", {
        gridTemplateColumns: "fr",
        alignItems: "center",
        gap: "base",
        children: /* @__PURE__ */ jsx("s-stack", {
          alignItems: "center",
          gap: "base",
          padding: "base",
          children: /* @__PURE__ */ jsx("s-section", {
            accessibilityLabel: "Sección de detalles del cliente",
            children: /* @__PURE__ */ jsxs("s-stack", {
              alignItems: "center",
              gap: "base",
              padding: "base",
              children: [/* @__PURE__ */ jsx("s-heading", {
                children: /* @__PURE__ */ jsx("strong", {
                  children: customer.full_name
                })
              }), /* @__PURE__ */ jsx("s-text", {
                color: "subdued",
                children: customer.email || "Sin correo registrado"
              }), /* @__PURE__ */ jsx("s-divider", {}), /* @__PURE__ */ jsxs("s-text", {
                color: "subdued",
                children: ["ID Interno: ", customer.id, " | ID Shopify: ", shopifyCustomerId]
              })]
            })
          })
        })
      }), /* @__PURE__ */ jsxs("s-grid", {
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: "base",
        children: [/* @__PURE__ */ jsxs("s-section", {
          padding: "base",
          children: [/* @__PURE__ */ jsx("s-heading", {
            children: "Deuda Total Pendiente"
          }), /* @__PURE__ */ jsx("s-box", {
            children: /* @__PURE__ */ jsxs("s-text", {
              type: "strong",
              children: ["$", totalDebt.toFixed(2)]
            })
          })]
        }), /* @__PURE__ */ jsxs("s-section", {
          padding: "base",
          children: [/* @__PURE__ */ jsx("s-heading", {
            children: "Saldo a Favor"
          }), /* @__PURE__ */ jsxs("s-stack", {
            direction: "inline",
            gap: "small",
            alignItems: "center",
            children: [/* @__PURE__ */ jsx("s-box", {
              children: /* @__PURE__ */ jsxs("s-text", {
                type: "strong",
                tone: "success",
                children: ["$", Number(customer.favorable_balance || 0).toFixed(2)]
              })
            }), /* @__PURE__ */ jsx("s-button", {
              variant: "secondary",
              onClick: () => setIsBalanceModalOpen(true),
              accessibilityLabel: "Gestionar saldo a favor",
              children: "Gestionar Saldo"
            })]
          })]
        }), /* @__PURE__ */ jsxs("s-section", {
          padding: "base",
          children: [/* @__PURE__ */ jsx("s-heading", {
            children: "Reputación Crediticia"
          }), /* @__PURE__ */ jsx("s-box", {
            children: reputationBadge(customer.reputation)
          })]
        })]
      }), /* @__PURE__ */ jsxs("s-grid", {
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: "base",
        children: [/* @__PURE__ */ jsxs("s-section", {
          padding: "base",
          children: [/* @__PURE__ */ jsx("s-heading", {
            children: "Créditos Completados"
          }), /* @__PURE__ */ jsx("s-box", {
            children: creditsCompleted > 0 ? /* @__PURE__ */ jsx("s-badge", {
              tone: "success",
              children: creditsCompleted
            }) : /* @__PURE__ */ jsx("s-text", {
              type: "strong",
              color: "subdued",
              children: "0"
            })
          })]
        }), /* @__PURE__ */ jsxs("s-section", {
          padding: "base",
          children: [/* @__PURE__ */ jsx("s-heading", {
            children: "Créditos Pendientes"
          }), /* @__PURE__ */ jsx("s-box", {
            children: creditsIncomplete > 0 ? /* @__PURE__ */ jsx("s-badge", {
              tone: "warning",
              children: creditsIncomplete
            }) : /* @__PURE__ */ jsx("s-text", {
              type: "strong",
              color: "subdued",
              children: "0"
            })
          })]
        }), /* @__PURE__ */ jsxs("s-section", {
          padding: "base",
          children: [/* @__PURE__ */ jsx("s-heading", {
            children: "Pagos a Tiempo"
          }), /* @__PURE__ */ jsx("s-box", {
            children: paymentsOnTime > 0 ? /* @__PURE__ */ jsx("s-badge", {
              tone: "success",
              children: paymentsOnTime
            }) : /* @__PURE__ */ jsx("s-text", {
              type: "strong",
              color: "subdued",
              children: "0"
            })
          })]
        }), /* @__PURE__ */ jsxs("s-section", {
          padding: "base",
          children: [/* @__PURE__ */ jsx("s-heading", {
            children: "Pagos Tardíos"
          }), /* @__PURE__ */ jsx("s-box", {
            children: paymentsLate > 0 ? /* @__PURE__ */ jsx("s-badge", {
              tone: "critical",
              children: paymentsLate
            }) : /* @__PURE__ */ jsx("s-text", {
              type: "strong",
              color: "subdued",
              children: "0"
            })
          })]
        })]
      }), /* @__PURE__ */ jsxs("s-section", {
        padding: "base",
        children: [/* @__PURE__ */ jsx("s-heading", {
          children: "Historial de Operaciones Completas"
        }), /* @__PURE__ */ jsxs("s-table", {
          variant: "auto",
          children: [/* @__PURE__ */ jsxs("s-table-header-row", {
            children: [/* @__PURE__ */ jsx("s-table-header", {
              listSlot: "primary",
              children: "Fecha"
            }), /* @__PURE__ */ jsx("s-table-header", {
              listSlot: "primary",
              children: "Tipo de Operación"
            }), /* @__PURE__ */ jsx("s-table-header", {
              children: "Referencia"
            }), /* @__PURE__ */ jsx("s-table-header", {
              format: "numeric",
              children: "Monto"
            }), /* @__PURE__ */ jsx("s-table-header", {
              children: "Puntualidad"
            }), /* @__PURE__ */ jsx("s-table-header", {
              listSlot: "secondary",
              children: "Estatus"
            }), /* @__PURE__ */ jsx("s-table-header", {
              listSlot: "primary",
              children: "Acciones"
            })]
          }), /* @__PURE__ */ jsx("s-table-body", {
            children: operations.length === 0 ? /* @__PURE__ */ jsx("s-table-row", {
              children: /* @__PURE__ */ jsx("s-table-cell", {
                children: /* @__PURE__ */ jsx("div", {
                  style: {
                    textAlign: "center"
                  },
                  children: /* @__PURE__ */ jsx("s-text", {
                    color: "subdued",
                    children: "Este cliente aún no tiene operaciones consolidadas registradas."
                  })
                })
              })
            }) : operations.map((op, idx) => /* @__PURE__ */ jsxs("s-table-row", {
              children: [/* @__PURE__ */ jsx("s-table-cell", {
                children: /* @__PURE__ */ jsx(ClientDate, {
                  dateString: op.date
                })
              }), /* @__PURE__ */ jsx("s-table-cell", {
                children: /* @__PURE__ */ jsx("s-badge", {
                  tone: op.type === "credit" ? "info" : "success",
                  children: op.label
                })
              }), /* @__PURE__ */ jsx("s-table-cell", {
                children: op.reference
              }), /* @__PURE__ */ jsxs("s-table-cell", {
                children: ["$", Number(op.amount).toFixed(2)]
              }), /* @__PURE__ */ jsx("s-table-cell", {
                children: op.type === "payment" ? op.punctuality_value !== null && op.punctuality_value !== void 0 ? Number(op.punctuality_value) === 100 ? /* @__PURE__ */ jsx("s-badge", {
                  tone: "success",
                  children: "A Tiempo"
                }) : /* @__PURE__ */ jsx("s-badge", {
                  tone: "critical",
                  children: "Tarde"
                }) : /* @__PURE__ */ jsx("s-text", {
                  color: "subdued",
                  children: "—"
                }) : /* @__PURE__ */ jsx("s-text", {
                  color: "subdued",
                  children: "N/A"
                })
              }), /* @__PURE__ */ jsx("s-table-cell", {
                children: /* @__PURE__ */ jsx("s-badge", {
                  tone: op.status === "APROBADO" || op.status === "PAGADO" || op.status === "EMITIDO" ? "success" : op.status === "PENDIENTE" || op.status === "EN_REVISION" || op.status === "PENDIENTE_ACTIVACION" || op.status === "EN_PROGRESO" ? "warning" : op.status === "CANCELADO" || op.status === "RECHAZADO" || op.status === "MORA" ? "critical" : "neutral",
                  children: op.status
                })
              }), /* @__PURE__ */ jsx("s-table-cell", {
                children: /* @__PURE__ */ jsx("s-button", {
                  href: op.link,
                  children: "Ver Detalles"
                })
              })]
            }, `${op.type}-${op.id}-${idx}`))
          })]
        })]
      }), /* @__PURE__ */ jsxs("s-section", {
        padding: "base",
        children: [/* @__PURE__ */ jsx("s-heading", {
          children: "Historial de Saldo a Favor"
        }), /* @__PURE__ */ jsxs("s-table", {
          variant: "auto",
          children: [/* @__PURE__ */ jsxs("s-table-header-row", {
            children: [/* @__PURE__ */ jsx("s-table-header", {
              listSlot: "primary",
              children: "Fecha"
            }), /* @__PURE__ */ jsx("s-table-header", {
              listSlot: "primary",
              children: "Acción"
            }), /* @__PURE__ */ jsx("s-table-header", {
              format: "numeric",
              children: "Monto"
            }), /* @__PURE__ */ jsx("s-table-header", {
              children: "Razón"
            }), /* @__PURE__ */ jsx("s-table-header", {
              format: "numeric",
              children: "Saldo Resultante"
            })]
          }), /* @__PURE__ */ jsx("s-table-body", {
            children: balanceHistory && balanceHistory.length === 0 ? /* @__PURE__ */ jsx("s-table-row", {
              children: /* @__PURE__ */ jsx("s-table-cell", {
                children: /* @__PURE__ */ jsx("div", {
                  style: {
                    textAlign: "center"
                  },
                  children: /* @__PURE__ */ jsx("s-text", {
                    color: "subdued",
                    children: "No hay movimientos de saldo a favor."
                  })
                })
              })
            }) : balanceHistory && balanceHistory.map((log) => {
              var _a2, _b, _c, _d;
              return /* @__PURE__ */ jsxs("s-table-row", {
                children: [/* @__PURE__ */ jsx("s-table-cell", {
                  children: /* @__PURE__ */ jsx(ClientDate, {
                    dateString: log.timestamp,
                    format: "datetime"
                  })
                }), /* @__PURE__ */ jsx("s-table-cell", {
                  children: ((_a2 = log.changes) == null ? void 0 : _a2.action) === "ADD" ? /* @__PURE__ */ jsx("s-badge", {
                    tone: "success",
                    children: "Nota de Crédito (+)"
                  }) : /* @__PURE__ */ jsx("s-badge", {
                    tone: "warning",
                    children: "Retiro de Fondos (-)"
                  })
                }), /* @__PURE__ */ jsxs("s-table-cell", {
                  children: ["$", Number((_b = log.changes) == null ? void 0 : _b.amount_changed).toFixed(2)]
                }), /* @__PURE__ */ jsx("s-table-cell", {
                  children: (_c = log.changes) == null ? void 0 : _c.reason
                }), /* @__PURE__ */ jsxs("s-table-cell", {
                  children: ["$", Number((_d = log.changes) == null ? void 0 : _d.new_balance).toFixed(2)]
                })]
              }, log.id);
            })
          })]
        })]
      }), isBalanceModalOpen && /* @__PURE__ */ jsx("s-modal", {
        open: isBalanceModalOpen,
        onClose: () => setIsBalanceModalOpen(false),
        title: "Gestionar Saldo a Favor",
        children: /* @__PURE__ */ jsxs("s-box", {
          padding: "base",
          children: [(actionData == null ? void 0 : actionData.error) && /* @__PURE__ */ jsx("s-banner", {
            tone: "critical",
            heading: "Error",
            children: /* @__PURE__ */ jsx("s-text", {
              children: actionData.error
            })
          }), (actionData == null ? void 0 : actionData.success) && /* @__PURE__ */ jsx("s-banner", {
            tone: "success",
            heading: "Éxito",
            children: /* @__PURE__ */ jsx("s-text", {
              children: "Saldo actualizado correctamente."
            })
          }), /* @__PURE__ */ jsxs("s-stack", {
            gap: "base",
            direction: "block",
            children: [/* @__PURE__ */ jsxs("s-select", {
              label: "Tipo de Operación",
              value: balanceForm.action,
              onChange: (e) => setBalanceForm((p) => ({
                ...p,
                action: e.target.value
              })),
              children: [/* @__PURE__ */ jsx("s-option", {
                value: "ADD",
                children: "Emitir Nota de Crédito (+ Aumentar saldo)"
              }), /* @__PURE__ */ jsx("s-option", {
                value: "SUBTRACT",
                children: "Retirar Fondos (- Devolver efectivo al cliente)"
              })]
            }), /* @__PURE__ */ jsx("s-number-field", {
              label: "Monto (USD)",
              value: balanceForm.amount,
              onChange: (e) => setBalanceForm((p) => ({
                ...p,
                amount: e.target.value
              }))
            }), /* @__PURE__ */ jsx("s-text-area", {
              label: "Motivo o Referencia",
              value: balanceForm.reason,
              onChange: (e) => setBalanceForm((p) => ({
                ...p,
                reason: e.target.value
              })),
              placeholder: "Ej: Devolución de mercancía...",
              rows: 2
            }), /* @__PURE__ */ jsxs("s-stack", {
              direction: "inline",
              gap: "small",
              justifyContent: "end",
              children: [/* @__PURE__ */ jsx("s-button", {
                variant: "secondary",
                onClick: () => setIsBalanceModalOpen(false),
                children: "Cerrar"
              }), /* @__PURE__ */ jsx("s-button", {
                variant: "primary",
                disabled: !balanceForm.amount || !balanceForm.reason,
                onClick: () => {
                  const formData = new FormData();
                  formData.append("intent", "manage_balance");
                  formData.append("customer_id", String(customer.id));
                  formData.append("amount", balanceForm.amount);
                  formData.append("action_type", balanceForm.action);
                  formData.append("reason", balanceForm.reason);
                  submit(formData, {
                    method: "post"
                  });
                  setBalanceForm({
                    amount: "",
                    action: "ADD",
                    reason: ""
                  });
                },
                children: "Confirmar"
              })]
            })]
          })]
        })
      }), /* @__PURE__ */ jsxs("s-stack", {
        padding: "base",
        alignItems: "center",
        gap: "base",
        children: [/* @__PURE__ */ jsx("s-text", {
          color: "subdued",
          children: "Desarrollado por Opentech LCC"
        }), /* @__PURE__ */ jsxs("s-text", {
          children: ["¿Tienes alguna duda?", " ", /* @__PURE__ */ jsx("s-link", {
            href: "https://lccopen.tech/contact",
            target: "_blank",
            children: "Contáctanos"
          }), "."]
        })]
      })]
    })]
  });
});
const route6 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$a,
  default: app_customer_detail_$id,
  loader: loader$b
}, Symbol.toStringTag, { value: "Module" }));
const loader$a = async ({
  request,
  params
}) => {
  const {
    session
  } = await authenticate.admin(request);
  const accessToken = await getAccessTokenForShop(session.shop);
  if (!accessToken) throw new Error("Token no disponible");
  const {
    id
  } = params;
  const BACKEND_URL2 = process.env.BACKEND_URL || "http://localhost:8000";
  const res = await fetch(`${BACKEND_URL2}/api/payments/${id}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });
  if (!res.ok) throw new Error("Pago no encontrado");
  const data = await res.json();
  const SPREADSHEET_CSV_URL2 = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQqrzXGB4grT2FhonRlj3jZVC3E9sSaZl9gkgd0nSrwtA55E_Fcy7Q3QDCO8lTMlDS_D21wgDGaXJ1x/pub?output=csv";
  let tasaBcv = null;
  let tasaFecha = null;
  try {
    const csvRes = await fetch(SPREADSHEET_CSV_URL2);
    if (csvRes.ok) {
      const text2 = await csvRes.text();
      const lines = text2.trim().split("\n").filter((l) => l.trim());
      const lastLine = lines[lines.length - 1];
      const match = lastLine.match(/"([\d.,]+)\s*Bs\."/);
      if (match) {
        tasaBcv = parseFloat(match[1].replace(".", "").replace(",", "."));
      }
      const dateMatch = lastLine.match(/(\d{1,2}\/\d{2}\/\d{4})/);
      if (dateMatch) {
        tasaFecha = dateMatch[1];
      }
    }
  } catch (e) {
    console.error("[payment_detail] Failed to fetch BCV rate:", e);
  }
  return {
    payment: data,
    tasaBcv,
    tasaFecha
  };
};
const action$9 = async ({
  request,
  params
}) => {
  const {
    session
  } = await authenticate.admin(request);
  const accessToken = await getAccessTokenForShop(session.shop);
  const {
    id
  } = params;
  const formData = await request.formData();
  const intent = formData.get("intent");
  if (intent === "cancel") {
    try {
      const BACKEND_URL2 = process.env.BACKEND_URL || "http://localhost:8000";
      const res = await fetch(`${BACKEND_URL2}/api/payments/${id}/review`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          status: "CANCELADO"
        })
      });
      if (!res.ok) return {
        error: "Error al cancelar pago"
      };
      return {
        success: true
      };
    } catch {
      return {
        error: "Error de red"
      };
    }
  }
  return null;
};
const app_payment_detail_$id = UNSAFE_withComponentProps(function PaymentDetail() {
  var _a2;
  const {
    payment,
    tasaBcv,
    tasaFecha
  } = useLoaderData();
  const submit = useSubmit();
  useNavigation();
  const actionData = useActionData();
  useEffect(() => {
    if (actionData == null ? void 0 : actionData.success) {
      alert("Pago cancelado correctamente.");
    } else if (actionData == null ? void 0 : actionData.error) {
      alert(actionData.error);
    }
  }, [actionData]);
  const handleCancel = () => {
    if (!confirm('¿Seguro que deseas cancelar este pago? El saldo volverá a la deuda del crédito y las cuotas volverán al estado "Pendiente".')) return;
    submit({
      intent: "cancel"
    }, {
      method: "post"
    });
  };
  const handleExport = (format) => {
    var _a3, _b, _c, _d, _e, _f, _g;
    if (!format || !payment) return;
    const summaryHeader = [["Atributo", "Valor"]];
    const summaryData = [["ID Pago", ((_a3 = payment.id) == null ? void 0 : _a3.toString()) || ""], ["Cliente", ((_c = (_b = payment.credit) == null ? void 0 : _b.customer) == null ? void 0 : _c.full_name) || ""], ["Monto Abonado", `$${Number(payment.amount).toFixed(2)}`], ["Fecha", new Date(payment.payment_date).toLocaleDateString()], ["Método", payment.payment_method], ["Banco", payment.bank_name || "N/A"], ["Referencia", payment.reference_number || "N/A"], ["Estado", payment.status || ""]];
    const creditDetailsData = [["ID Crédito", ((_e = (_d = payment.credit) == null ? void 0 : _d.id) == null ? void 0 : _e.toString()) || ""], ["Concepto", ((_f = payment.credit) == null ? void 0 : _f.concept) || ""]];
    const proofData = payment.proof ? [["Banco Reportante", payment.proof.bank_name], ["Referencia Reportada", payment.proof.reference_number], ["Monto Reportado", `$${Number(payment.proof.amount).toFixed(2)}`], ["Fecha Reporte", new Date(payment.proof.submitted_at).toLocaleDateString()], ["Notas Cliente", payment.proof.notes || "N/A"]] : [];
    const productsData = (((_g = payment.credit) == null ? void 0 : _g.items) || []).map((i) => ({
      Producto: i.product_name,
      Cantidad: i.quantity.toString(),
      "Precio Unit.": `$${Number(i.unit_price).toFixed(2)}`,
      Total: `$${(Number(i.unit_price) * i.quantity).toFixed(2)}`
    }));
    if (format === "csv" || format === "xlsx") {
      const wb = XLSX.utils.book_new();
      const wsSummary = XLSX.utils.aoa_to_sheet([...summaryHeader, ...summaryData, [], ["--- Crédito Asociado ---", ""], ...creditDetailsData]);
      if (proofData.length > 0) {
        XLSX.utils.sheet_add_aoa(wsSummary, [[], ["--- Comprobante ---", ""], ...proofData], {
          origin: -1
        });
      }
      XLSX.utils.book_append_sheet(wb, wsSummary, "Resumen Pago");
      if (productsData.length > 0) {
        const wsProducts = XLSX.utils.json_to_sheet(productsData);
        XLSX.utils.book_append_sheet(wb, wsProducts, "Productos");
      }
      if (format === "csv") {
        const allData = [["--- Resumen Pago ---"], ...summaryHeader, ...summaryData, [], ["--- Crédito Asociado ---"], ...creditDetailsData, [], ...proofData.length > 0 ? [["--- Comprobante ---"], ...proofData, []] : [], ["--- Productos ---"], productsData.length > 0 ? Object.keys(productsData[0]) : [], ...productsData.map(Object.values)];
        const wbCsv = XLSX.utils.book_new();
        const wsCombined = XLSX.utils.aoa_to_sheet(allData);
        XLSX.utils.book_append_sheet(wbCsv, wsCombined, "Export");
        XLSX.writeFile(wbCsv, `pago_${payment.id}.csv`);
      } else {
        XLSX.writeFile(wb, `pago_${payment.id}.xlsx`);
      }
    } else if (format === "pdf") {
      const doc = new jsPDF();
      doc.text(`Detalles de Pago #${payment.id}`, 14, 15);
      autoTable(doc, {
        startY: 20,
        head: summaryHeader,
        body: summaryData
      });
      let currentY = doc.lastAutoTable.finalY + 10;
      doc.text("Crédito Asociado", 14, currentY);
      autoTable(doc, {
        startY: currentY + 5,
        body: creditDetailsData
      });
      currentY = doc.lastAutoTable.finalY + 10;
      if (proofData.length > 0) {
        doc.text("Comprobante Reportado", 14, currentY);
        autoTable(doc, {
          startY: currentY + 5,
          body: proofData
        });
        currentY = doc.lastAutoTable.finalY + 10;
      }
      if (productsData.length > 0) {
        doc.text("Productos en Crédito", 14, currentY);
        autoTable(doc, {
          startY: currentY + 5,
          head: [Object.keys(productsData[0])],
          body: productsData.map(Object.values)
        });
      }
      doc.save(`pago_${payment.id}.pdf`);
    }
  };
  return /* @__PURE__ */ jsxs("s-page", {
    heading: `Detalles de Pago #${payment.id}`,
    children: [/* @__PURE__ */ jsx("s-box", {
      paddingBlockEnd: "base",
      paddingInlineStart: "base",
      paddingInlineEnd: "base",
      children: /* @__PURE__ */ jsxs("s-stack", {
        direction: "inline",
        justifyContent: "end",
        gap: "small-200",
        children: [/* @__PURE__ */ jsx("s-button", {
          variant: "secondary",
          accessibilityLabel: "Opciones de exportación",
          commandFor: "export-popover",
          command: "--toggle",
          children: "Exportar"
        }), /* @__PURE__ */ jsx("s-popover", {
          id: "export-popover",
          children: /* @__PURE__ */ jsxs("s-stack", {
            direction: "block",
            gap: "small",
            padding: "base",
            children: [/* @__PURE__ */ jsx("s-button", {
              accessibilityLabel: "Exportar como CSV",
              variant: "tertiary",
              onClick: () => handleExport("csv"),
              children: "Exportar a CSV"
            }), /* @__PURE__ */ jsx("s-button", {
              accessibilityLabel: "Exportar como XLSX",
              variant: "tertiary",
              onClick: () => handleExport("xlsx"),
              children: "Exportar a XLSX"
            }), /* @__PURE__ */ jsx("s-button", {
              accessibilityLabel: "Exportar como PDF",
              variant: "tertiary",
              onClick: () => handleExport("pdf"),
              children: "Exportar a PDF"
            })]
          })
        })]
      })
    }), tasaBcv && /* @__PURE__ */ jsx("s-box", {
      paddingBlockEnd: "base",
      children: /* @__PURE__ */ jsx("s-banner", {
        tone: "info",
        heading: "Tasa de Cambio Oficial (BCV)",
        children: /* @__PURE__ */ jsxs("s-text", {
          children: ["La tasa de cambio actual es de ", /* @__PURE__ */ jsxs("strong", {
            children: ["Bs. ", tasaBcv.toFixed(2)]
          }), " por USD.", tasaFecha && ` Actualizada el: ${tasaFecha}.`]
        })
      })
    }), /* @__PURE__ */ jsxs("s-stack", {
      gap: "base",
      children: [/* @__PURE__ */ jsxs("s-grid", {
        gridTemplateColumns: "1fr 1fr",
        gap: "base",
        children: [/* @__PURE__ */ jsxs("s-section", {
          padding: "base",
          children: [/* @__PURE__ */ jsxs("s-stack", {
            direction: "inline",
            alignItems: "center",
            gap: "small",
            justifyContent: "space-between",
            children: [/* @__PURE__ */ jsx("s-heading", {
              children: /* @__PURE__ */ jsx("strong", {
                children: "Información del Pago"
              })
            }), /* @__PURE__ */ jsx("s-badge", {
              tone: payment.status === "APROBADO" ? "success" : payment.status === "RECHAZADO" || payment.status === "NO_PAGADO" ? "critical" : "warning",
              children: payment.status === "APROBADO" ? "✅ Aprobado" : payment.status === "EN_REVISION" ? "🕐 En Revisión" : payment.status === "RECHAZADO" ? "❌ Rechazado" : payment.status === "NO_PAGADO" ? "🚫 No Pagado" : payment.status === "CANCELADO" ? "⛔ Cancelado" : payment.status
            })]
          }), /* @__PURE__ */ jsxs("s-stack", {
            gap: "small",
            padding: "base",
            children: [/* @__PURE__ */ jsxs("s-text", {
              children: [/* @__PURE__ */ jsx("strong", {
                children: "Monto:"
              }), " $", Number(payment.amount).toFixed(2)]
            }), (payment.payment_method === "PAGO_MOVIL" || payment.payment_method === "BANK" || payment.payment_method === "EFECTIVO") && tasaBcv && /* @__PURE__ */ jsx("s-text", {
              color: "subdued",
              children: /* @__PURE__ */ jsxs("em", {
                children: ["Equivalente estimado: Bs. ", (Number(payment.amount) * tasaBcv).toFixed(2)]
              })
            }), /* @__PURE__ */ jsxs("s-text", {
              children: [/* @__PURE__ */ jsx("strong", {
                children: "Fecha:"
              }), " ", /* @__PURE__ */ jsx(ClientDate, {
                dateString: payment.payment_date,
                format: "datetime"
              })]
            }), /* @__PURE__ */ jsxs("s-stack", {
              direction: "inline",
              gap: "extra-tight",
              alignItems: "end",
              children: [/* @__PURE__ */ jsx("s-text", {
                children: /* @__PURE__ */ jsx("strong", {
                  children: "Método de Pago:"
                })
              }), /* @__PURE__ */ jsx("s-badge", {
                tone: "info",
                children: payment.payment_method === "CASH" ? "Efectivo USD" : payment.payment_method === "EFECTIVO" ? "Efectivo VEF" : payment.payment_method === "BANK" ? "Transferencia Bancaria" : payment.payment_method === "PAGO_MOVIL" ? "Pago Móvil" : payment.payment_method
              }), payment.bank_name && /* @__PURE__ */ jsx("s-badge", {
                tone: "neutral",
                children: payment.bank_name
              })]
            }), /* @__PURE__ */ jsxs("s-text", {
              children: [/* @__PURE__ */ jsx("strong", {
                children: "Referencia:"
              }), " ", ((_a2 = payment.reference_number) == null ? void 0 : _a2.startsWith("INTENT-")) ? `RECORDATORIO-${payment.reference_number.split("-")[1]}-ENVIADO` : payment.reference_number]
            }), payment.notes && /* @__PURE__ */ jsxs("s-text", {
              children: [/* @__PURE__ */ jsx("strong", {
                children: "Detalles:"
              }), " ", payment.notes]
            })]
          })]
        }), /* @__PURE__ */ jsxs("s-section", {
          padding: "base",
          children: [/* @__PURE__ */ jsx("s-stack", {
            alignItems: "center",
            gap: "base",
            children: /* @__PURE__ */ jsx("s-heading", {
              children: /* @__PURE__ */ jsx("strong", {
                children: "Información del Cliente"
              })
            })
          }), /* @__PURE__ */ jsxs("s-stack", {
            gap: "small",
            padding: "base",
            children: [/* @__PURE__ */ jsx("s-text", {
              type: "strong",
              children: payment.credit.customer.full_name
            }), /* @__PURE__ */ jsx("s-text", {
              color: "subdued",
              children: payment.credit.customer.email
            }), /* @__PURE__ */ jsx("s-divider", {}), /* @__PURE__ */ jsxs("s-text", {
              children: [/* @__PURE__ */ jsx("strong", {
                children: "Crédito Asociado:"
              }), " #", payment.credit.id]
            }), /* @__PURE__ */ jsxs("s-text", {
              children: [/* @__PURE__ */ jsx("strong", {
                children: "Concepto:"
              }), " ", payment.credit.concept]
            }), /* @__PURE__ */ jsx("s-link", {
              href: `/app/credit_detail/${payment.credit.id}`,
              children: "Ver detalles del crédito"
            })]
          })]
        })]
      }), payment.proof && /* @__PURE__ */ jsx("s-section", {
        padding: "base",
        children: /* @__PURE__ */ jsxs("s-stack", {
          gap: "small",
          padding: "base",
          children: [/* @__PURE__ */ jsx("s-stack", {
            alignItems: "center",
            gap: "base",
            children: /* @__PURE__ */ jsx("s-heading", {
              children: /* @__PURE__ */ jsx("strong", {
                children: "Comprobante Reportado (vía Web Pública)"
              })
            })
          }), /* @__PURE__ */ jsx("s-text", {
            color: "subdued",
            children: "Este pago fue reportado por el cliente con los siguientes datos:"
          }), /* @__PURE__ */ jsxs("s-grid", {
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "small",
            children: [/* @__PURE__ */ jsxs("s-stack", {
              children: [/* @__PURE__ */ jsx("s-text", {
                color: "subdued",
                children: "Banco:"
              }), /* @__PURE__ */ jsx("s-text", {
                children: payment.proof.bank_name
              })]
            }), /* @__PURE__ */ jsxs("s-stack", {
              children: [/* @__PURE__ */ jsx("s-text", {
                color: "subdued",
                children: "Referencia:"
              }), /* @__PURE__ */ jsx("s-text", {
                children: payment.proof.reference_number
              })]
            }), /* @__PURE__ */ jsxs("s-stack", {
              children: [/* @__PURE__ */ jsx("s-text", {
                color: "subdued",
                children: "Monto Reportado:"
              }), /* @__PURE__ */ jsxs("s-text", {
                children: ["$", Number(payment.proof.amount).toFixed(2)]
              }), tasaBcv && /* @__PURE__ */ jsx("s-text", {
                color: "subdued",
                size: "small",
                children: /* @__PURE__ */ jsxs("em", {
                  children: ["(Aprox: Bs. ", (Number(payment.proof.amount) * tasaBcv).toFixed(2), ")"]
                })
              })]
            }), /* @__PURE__ */ jsxs("s-stack", {
              children: [/* @__PURE__ */ jsx("s-text", {
                color: "subdued",
                children: "Fecha de Envío:"
              }), /* @__PURE__ */ jsx("s-text", {
                children: /* @__PURE__ */ jsx(ClientDate, {
                  dateString: payment.proof.submitted_at,
                  format: "datetime"
                })
              })]
            }), payment.proof.notes && /* @__PURE__ */ jsxs("s-grid-item", {
              gridColumn: "span 2",
              children: [/* @__PURE__ */ jsx("s-text", {
                color: "subdued",
                children: "Notas del Cliente:"
              }), /* @__PURE__ */ jsx("s-text", {
                children: payment.proof.notes
              })]
            })]
          })]
        })
      }), /* @__PURE__ */ jsxs("s-section", {
        padding: "base",
        children: [/* @__PURE__ */ jsx("s-stack", {
          alignItems: "center",
          gap: "base",
          children: /* @__PURE__ */ jsx("s-heading", {
            children: "Productos en este Crédito"
          })
        }), /* @__PURE__ */ jsxs("s-table", {
          variant: "auto",
          children: [/* @__PURE__ */ jsxs("s-table-header-row", {
            children: [/* @__PURE__ */ jsx("s-table-header", {
              children: "Producto"
            }), /* @__PURE__ */ jsx("s-table-header", {
              format: "numeric",
              children: "Cantidad"
            }), /* @__PURE__ */ jsx("s-table-header", {
              format: "numeric",
              children: "Precio Unit."
            }), /* @__PURE__ */ jsx("s-table-header", {
              format: "numeric",
              children: "Total"
            })]
          }), /* @__PURE__ */ jsx("s-table-body", {
            children: payment.credit.items.map((item, idx) => /* @__PURE__ */ jsxs("s-table-row", {
              children: [/* @__PURE__ */ jsx("s-table-cell", {
                children: item.product_name
              }), /* @__PURE__ */ jsx("s-table-cell", {
                children: item.quantity
              }), /* @__PURE__ */ jsxs("s-table-cell", {
                children: ["$", Number(item.unit_price).toFixed(2)]
              }), /* @__PURE__ */ jsxs("s-table-cell", {
                children: ["$", (Number(item.unit_price) * item.quantity).toFixed(2)]
              })]
            }, idx))
          })]
        })]
      }), /* @__PURE__ */ jsx("s-stack", {
        direction: "inline",
        padding: "base",
        justifyContent: "end",
        gap: "small",
        children: payment.status !== "CANCELADO" && payment.status !== "RECHAZADO" && /* @__PURE__ */ jsx("s-button", {
          variant: "primary",
          tone: "critical",
          onClick: handleCancel,
          accessibilityLabel: "Cancelar este pago",
          children: "Cancelar"
        })
      })]
    }), /* @__PURE__ */ jsxs("s-stack", {
      padding: "base",
      alignItems: "center",
      gap: "small",
      children: [/* @__PURE__ */ jsx("s-text", {
        color: "subdued",
        children: "Desarrollado por Opentech LCC"
      }), /* @__PURE__ */ jsxs("s-text", {
        children: ["¿Tienes alguna duda?", " ", /* @__PURE__ */ jsx("s-link", {
          href: "https://lccopen.tech/contact",
          target: "_blank",
          children: "Contáctanos"
        }), "."]
      })]
    })]
  });
});
const ErrorBoundary$1 = UNSAFE_withErrorBoundaryProps(function ErrorBoundary2() {
  const error = useRouteError();
  const errorMessage = isRouteErrorResponse(error) ? `${error.status} ${error.statusText}` : error instanceof Error ? error.message : "Ocurrió un error inesperado al conectar con el servidor.";
  return /* @__PURE__ */ jsx("s-page", {
    heading: "Error in Payment Detail",
    inlineSize: "large",
    children: /* @__PURE__ */ jsx("s-section", {
      padding: "base",
      children: /* @__PURE__ */ jsxs("s-banner", {
        tone: "critical",
        heading: "Ha ocurrido un problema",
        children: [/* @__PURE__ */ jsx("p", {
          children: errorMessage
        }), /* @__PURE__ */ jsx("p", {
          style: {
            marginTop: "10px"
          },
          children: "Por favor, reintenta más tarde o revisa tu conexión."
        })]
      })
    })
  });
});
const route7 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  ErrorBoundary: ErrorBoundary$1,
  action: action$9,
  default: app_payment_detail_$id,
  loader: loader$a
}, Symbol.toStringTag, { value: "Module" }));
const cleanPhoneForWhatsApp$1 = (phone) => {
  return phone.replace(/[^0-9]/g, "");
};
const WhatsAppIcon$1 = () => /* @__PURE__ */ jsx("svg", {
  xmlns: "http://www.w3.org/2000/svg",
  viewBox: "0 0 448 512",
  width: "16",
  height: "16",
  fill: "#25D366",
  style: {
    verticalAlign: "middle"
  },
  children: /* @__PURE__ */ jsx("path", {
    d: "M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7.9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z"
  })
});
const loader$9 = async ({
  request,
  params
}) => {
  const {
    session
  } = await authenticate.admin(request);
  const accessToken = await getAccessTokenForShop(session.shop);
  if (!accessToken) throw new Error("Token no disponible");
  const {
    id
  } = params;
  const BACKEND_URL2 = process.env.BACKEND_URL || "http://localhost:8000";
  const [creditRes, paymentsRes] = await Promise.all([fetch(`${BACKEND_URL2}/api/credits/${id}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  }), fetch(`${BACKEND_URL2}/api/credits/payments/by-credit/${id}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  })]);
  if (!creditRes.ok) throw new Error("Credit no encontrado");
  const credit = await creditRes.json();
  const payments = paymentsRes.ok ? await paymentsRes.json() : [];
  return {
    credit,
    payments
  };
};
const action$8 = async ({
  request,
  params
}) => {
  const {
    session
  } = await authenticate.admin(request);
  const accessToken = await getAccessTokenForShop(session.shop);
  const {
    id
  } = params;
  const formData = await request.formData();
  const intent = formData.get("intent");
  const authHeaders = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${accessToken}`
  };
  const BACKEND_URL2 = process.env.BACKEND_URL || "http://localhost:8000";
  if (intent === "approve") {
    const concept = formData.get("concept");
    try {
      const response = await fetch(`${BACKEND_URL2}/api/credits/${id}`, {
        method: "PUT",
        headers: authHeaders,
        body: JSON.stringify({
          status: "EMITIDO",
          concept
        })
      });
      if (!response.ok) {
        const error = await response.json();
        return {
          error: error.detail || "Error al aprobar el crédito"
        };
      }
      return {
        success: true
      };
    } catch {
      return {
        error: "Error de conexión"
      };
    }
  }
  if (intent === "cancel") {
    try {
      const response = await fetch(`${BACKEND_URL2}/api/credits/${id}/cancel`, {
        method: "PUT",
        headers: authHeaders
        // USE authHeaders here instead of just Authorization
      });
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Backend error response on cancel:", errorText);
        try {
          const errorJson = JSON.parse(errorText);
          return {
            error: errorJson.detail || "Error al cancelar el crédito"
          };
        } catch (e) {
          return {
            error: `Error interno del servidor: ${errorText.substring(0, 50)}...`
          };
        }
      }
      return redirect(`/app/credit_detail/${id}`);
    } catch (e) {
      console.error("Fetch exception on cancel:", e);
      return {
        error: `Error de conexión: ${e.message}`
      };
    }
  }
  if (intent === "send_reminder") {
    const body = {
      credit_id: Number(id),
      installment_id: formData.get("installment_id") ? Number(formData.get("installment_id")) : null,
      amount: Number(formData.get("amount")),
      customer_email: formData.get("customer_email")
    };
    try {
      const res = await fetch(`${BACKEND_URL2}/api/payments/payment-tokens`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify(body)
      });
      if (!res.ok) return {
        error: "No se pudo enviar",
        key: formData.get("key")
      };
      return {
        success: true,
        key: formData.get("key")
      };
    } catch {
      return {
        error: "Error",
        key: formData.get("key")
      };
    }
  }
  return null;
};
const app_credit_detail_$id = UNSAFE_withComponentProps(function CreditDetail() {
  var _a2, _b, _c, _d;
  const {
    credit,
    payments
  } = useLoaderData();
  const submit = useSubmit();
  const navigation = useNavigation();
  const actionData = useActionData();
  const isSubmitting = navigation.state === "submitting";
  const submittingKey = (_a2 = navigation.formData) == null ? void 0 : _a2.get("key");
  const [isEditing, setIsEditing] = useState(false);
  const [editConcept, setEditConcept] = useState(credit.concept || "");
  const [statusMap, setStatusMap] = useState({});
  useEffect(() => {
    var _a3;
    if ((actionData == null ? void 0 : actionData.success) && ((_a3 = navigation.formData) == null ? void 0 : _a3.get("intent")) === "approve") {
      setIsEditing(false);
    }
    if (actionData == null ? void 0 : actionData.key) {
      setStatusMap((prev) => ({
        ...prev,
        [actionData.key]: actionData.success ? "sent" : "error"
      }));
    }
  }, [actionData, navigation.formData]);
  const handleApprove = () => {
    submit({
      intent: "approve",
      concept: editConcept
    }, {
      method: "post"
    });
  };
  const handleCancel = () => {
    if (!confirm("¿Seguro que deseas cancelar este crédito? Los pagos pendientes ya no serán esperados.")) return;
    submit({
      intent: "cancel"
    }, {
      method: "post"
    });
  };
  const approvedPayments = payments.filter((p) => p.status === "APROBADO");
  const lastPayment = approvedPayments.length > 0 ? approvedPayments[0] : null;
  const lastPaymentAmount = lastPayment ? Number(lastPayment.amount) : 0;
  const totalPaid = approvedPayments.reduce((sum, p) => sum + Number(p.amount), 0);
  const remainingDebt = Number((credit == null ? void 0 : credit.total_amount) ?? 0) - totalPaid;
  const handleSendReminder = (installmentId, expectedAmount) => {
    var _a3;
    let email = (_a3 = credit == null ? void 0 : credit.customer) == null ? void 0 : _a3.email;
    if (!email) {
      const promptEmail = window.prompt("El cliente no tiene email registrado. Por favor, ingréselo para enviar el recordatorio:");
      if (!promptEmail || !promptEmail.includes("@")) {
        alert("Email no válido operacion cancelada.");
        return;
      }
      email = promptEmail;
    }
    const key = installmentId !== null ? installmentId.toString() : "fiado";
    submit({
      intent: "send_reminder",
      installment_id: installmentId ? installmentId.toString() : "",
      amount: expectedAmount.toString(),
      customer_email: email,
      key
    }, {
      method: "post"
    });
  };
  const handleExport = (format) => {
    var _a3, _b2, _c2;
    if (!format || !credit) return;
    const summaryHeader = [["Atributo", "Valor"]];
    const summaryData = [["ID Crédito", ((_a3 = credit.id) == null ? void 0 : _a3.toString()) || ""], ["Cliente", ((_b2 = credit.customer) == null ? void 0 : _b2.full_name) || ""], ["Email", ((_c2 = credit.customer) == null ? void 0 : _c2.email) || ""], ["Estado", credit.status || ""], ["Monto Total Crédito", `$${Number(credit.total_amount).toFixed(2)}`], ["Último Monto Pagado", `$${lastPaymentAmount.toFixed(2)}`], ["Deuda Total Restante", `$${remainingDebt.toFixed(2)}`], ["Fecha Emisión", credit.created_at ? new Date(credit.created_at).toLocaleDateString() : ""]];
    const installmentsData = (credit.installments || []).map((i) => ({
      Vencimiento: new Date(i.due_date).toLocaleDateString(),
      "Cuota Nro": i.number.toString(),
      "Monto Esperado": `$${Number(i.amount).toFixed(2)}`,
      Estado: i.status
    }));
    const paymentsData = payments.map((p) => ({
      Fecha: new Date(p.payment_date).toLocaleDateString(),
      Referencia: p.reference_number || "N/A",
      "Monto Abonado": `$${Number(p.amount).toFixed(2)}`,
      Estatus: p.status
    }));
    const productsData = (credit.items || []).map((i) => {
      var _a4;
      return {
        "Codigo de Producto": i.product_code || ((_a4 = i.product_id) == null ? void 0 : _a4.split("/").pop()) || "N/A",
        Producto: i.product_name,
        Total: `$${Number(i.total_price || 0).toFixed(2)}`
      };
    });
    if (format === "csv" || format === "xlsx") {
      const wb = XLSX.utils.book_new();
      const wsSummary = XLSX.utils.aoa_to_sheet([...summaryHeader, ...summaryData]);
      XLSX.utils.book_append_sheet(wb, wsSummary, "Resumen");
      if (installmentsData.length > 0) {
        const wsInstallments = XLSX.utils.json_to_sheet(installmentsData);
        XLSX.utils.book_append_sheet(wb, wsInstallments, "Cuotas");
      }
      if (paymentsData.length > 0) {
        const wsPayments = XLSX.utils.json_to_sheet(paymentsData);
        XLSX.utils.book_append_sheet(wb, wsPayments, "Abonos");
      }
      if (productsData.length > 0) {
        const wsProducts = XLSX.utils.json_to_sheet(productsData);
        XLSX.utils.book_append_sheet(wb, wsProducts, "Productos");
      }
      if (format === "csv") {
        const allData = [["--- Resumen ---"], ...summaryHeader, ...summaryData, [], ["--- Cuotas ---"], installmentsData.length > 0 ? Object.keys(installmentsData[0]) : [], ...installmentsData.map(Object.values), [], ["--- Abonos ---"], paymentsData.length > 0 ? Object.keys(paymentsData[0]) : [], ...paymentsData.map(Object.values), [], ["--- Productos ---"], productsData.length > 0 ? Object.keys(productsData[0]) : [], ...productsData.map(Object.values)];
        const wbCsv = XLSX.utils.book_new();
        const wsCombined = XLSX.utils.aoa_to_sheet(allData);
        XLSX.utils.book_append_sheet(wbCsv, wsCombined, "Export");
        XLSX.writeFile(wbCsv, `credito_${credit.id}.csv`);
      } else {
        XLSX.writeFile(wb, `credito_${credit.id}.xlsx`);
      }
    } else if (format === "pdf") {
      const doc = new jsPDF();
      doc.text(`Detalles de Crédito #${credit.id}`, 14, 15);
      autoTable(doc, {
        startY: 20,
        head: summaryHeader,
        body: summaryData
      });
      let currentY = doc.lastAutoTable.finalY + 10;
      if (installmentsData.length > 0) {
        doc.text("Cuotas / Pagos Esperados", 14, currentY);
        autoTable(doc, {
          startY: currentY + 5,
          head: [Object.keys(installmentsData[0])],
          body: installmentsData.map(Object.values)
        });
        currentY = doc.lastAutoTable.finalY + 10;
      }
      if (paymentsData.length > 0) {
        doc.text("Historial de Abonos", 14, currentY);
        autoTable(doc, {
          startY: currentY + 5,
          head: [Object.keys(paymentsData[0])],
          body: paymentsData.map(Object.values)
        });
        currentY = doc.lastAutoTable.finalY + 10;
      }
      if (productsData.length > 0) {
        doc.text("Productos Vinculados", 14, currentY);
        autoTable(doc, {
          startY: currentY + 5,
          head: [Object.keys(productsData[0])],
          body: productsData.map(Object.values)
        });
      }
      doc.save(`credito_${credit.id}.pdf`);
    }
  };
  return /* @__PURE__ */ jsxs("s-page", {
    heading: "Detalles de Crédito",
    children: [/* @__PURE__ */ jsx("s-button", {
      variant: "primary",
      href: "/app/registre_payment",
      accessibilityLabel: "Registrar un nuevo pago",
      slot: "primary-action",
      children: "Registrar Pago"
    }), /* @__PURE__ */ jsx("s-box", {
      paddingBlockEnd: "base",
      paddingInlineStart: "base",
      paddingInlineEnd: "base",
      children: /* @__PURE__ */ jsxs("s-stack", {
        direction: "inline",
        justifyContent: "end",
        gap: "small-200",
        children: [/* @__PURE__ */ jsx("s-button", {
          variant: "secondary",
          accessibilityLabel: "Opciones de exportación",
          commandFor: "export-popover",
          command: "--toggle",
          children: "Exportar"
        }), /* @__PURE__ */ jsx("s-popover", {
          id: "export-popover",
          children: /* @__PURE__ */ jsxs("s-stack", {
            direction: "block",
            gap: "small",
            padding: "base",
            children: [/* @__PURE__ */ jsx("s-button", {
              accessibilityLabel: "Exportar como CSV",
              variant: "tertiary",
              onClick: () => handleExport("csv"),
              children: "Exportar a CSV"
            }), /* @__PURE__ */ jsx("s-button", {
              accessibilityLabel: "Exportar como XLSX",
              variant: "tertiary",
              onClick: () => handleExport("xlsx"),
              children: "Exportar a XLSX"
            }), /* @__PURE__ */ jsx("s-button", {
              accessibilityLabel: "Exportar como PDF",
              variant: "tertiary",
              onClick: () => handleExport("pdf"),
              children: "Exportar a PDF"
            })]
          })
        })]
      })
    }), (actionData == null ? void 0 : actionData.error) && /* @__PURE__ */ jsx("s-banner", {
      tone: "critical",
      heading: "Error",
      children: /* @__PURE__ */ jsx("s-text", {
        children: actionData.error
      })
    }), credit && /* @__PURE__ */ jsxs("s-stack", {
      gap: "base",
      children: [/* @__PURE__ */ jsxs("s-grid", {
        gridTemplateColumns: "fr",
        alignItems: "center",
        gap: "base",
        children: [/* @__PURE__ */ jsxs("s-stack", {
          alignItems: "center",
          gap: "base",
          children: [/* @__PURE__ */ jsx("s-section", {
            accessibilityLabel: "Sección de detalles de orden",
            children: /* @__PURE__ */ jsxs("s-stack", {
              alignItems: "center",
              children: [/* @__PURE__ */ jsx("s-heading", {
                children: /* @__PURE__ */ jsx("strong", {
                  children: "Detalles de orden"
                })
              }), /* @__PURE__ */ jsx("s-text", {
                children: ((_b = credit.customer) == null ? void 0 : _b.full_name) || "Error al obtener nombre de cliente"
              }), /* @__PURE__ */ jsx("s-section", {
                children: /* @__PURE__ */ jsx("s-text", {
                  children: ((_c = credit.customer) == null ? void 0 : _c.email) || "Error al obtener correo de cliente"
                })
              }), /* @__PURE__ */ jsxs("s-text", {
                color: "subdued",
                children: ["ID: ", credit.invoice_code || credit.id]
              })]
            })
          }), /* @__PURE__ */ jsx("s-badge", {
            tone: credit.status === "EMITIDO" ? "neutral" : credit.status === "PENDIENTE_ACTIVACION" ? "warning" : credit.status === "EN_PROGRESO" ? "info" : credit.status === "PAGADO" ? "success" : "info",
            children: credit.status
          })]
        }), /* @__PURE__ */ jsxs("s-stack", {
          alignItems: "end",
          children: [credit.status === "PENDIENTE_ACTIVACION" && /* @__PURE__ */ jsx("s-box", {
            paddingBlockStart: "base",
            children: /* @__PURE__ */ jsx("s-stack", {
              gap: "base",
              children: isEditing ? /* @__PURE__ */ jsxs(Fragment, {
                children: [/* @__PURE__ */ jsx("input", {
                  type: "text",
                  style: {
                    padding: "8px",
                    borderRadius: "4px",
                    border: "1px solid #c9cccf",
                    width: "200px"
                  },
                  value: editConcept || "",
                  onChange: (e) => setEditConcept(e.target.value),
                  placeholder: "Concepto (ej. Financiamiento)"
                }), /* @__PURE__ */ jsxs("s-button-group", {
                  children: [/* @__PURE__ */ jsx("s-button", {
                    tone: "auto",
                    onClick: handleApprove,
                    disabled: isSubmitting || void 0,
                    accessibilityLabel: "Guardar concepto y aprobar crédito",
                    children: "Guardar y Aprobar"
                  }), /* @__PURE__ */ jsx("s-button", {
                    onClick: () => setIsEditing(false),
                    disabled: isSubmitting || void 0,
                    accessibilityLabel: "Cancelar edición de aprobación",
                    children: "Cancelar"
                  })]
                })]
              }) : /* @__PURE__ */ jsx("s-button", {
                tone: "auto",
                onClick: () => setIsEditing(true),
                disabled: isSubmitting || void 0,
                accessibilityLabel: "Iniciar aprobación de crédito",
                children: "Aprobar Crédito"
              })
            })
          }), credit.status !== "CANCELADO" && credit.status !== "PAGADO" && credit.status !== "PENDIENTE_ACTIVACION" && /* @__PURE__ */ jsx("s-box", {
            paddingBlockStart: "base",
            children: /* @__PURE__ */ jsx("s-button", {
              variant: "primary",
              tone: "critical",
              onClick: handleCancel,
              accessibilityLabel: "Cancelar este crédito",
              children: "Cancelar"
            })
          })]
        })]
      }), /* @__PURE__ */ jsxs("s-grid", {
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: "base",
        children: [/* @__PURE__ */ jsxs("s-section", {
          padding: "base",
          children: [/* @__PURE__ */ jsx("s-heading", {
            children: "Último Monto Pagado"
          }), /* @__PURE__ */ jsx("s-box", {
            children: /* @__PURE__ */ jsxs("s-text", {
              type: "strong",
              children: ["$", lastPaymentAmount.toFixed(2)]
            })
          })]
        }), /* @__PURE__ */ jsxs("s-section", {
          padding: "base",
          children: [/* @__PURE__ */ jsx("s-heading", {
            children: "Monto Total del Crédito"
          }), /* @__PURE__ */ jsx("s-box", {
            children: /* @__PURE__ */ jsxs("s-text", {
              type: "strong",
              children: ["$", Number(credit.total_amount).toFixed(2)]
            })
          })]
        }), /* @__PURE__ */ jsxs("s-section", {
          padding: "base",
          children: [/* @__PURE__ */ jsx("s-heading", {
            children: "Deuda Total Restante"
          }), /* @__PURE__ */ jsx("s-box", {
            children: /* @__PURE__ */ jsxs("s-text", {
              type: "strong",
              children: ["$", remainingDebt.toFixed(2)]
            })
          })]
        })]
      }), /* @__PURE__ */ jsxs("s-section", {
        padding: "base",
        children: [/* @__PURE__ */ jsx("s-heading", {
          children: "Pagos Pendientes / Cuotas"
        }), /* @__PURE__ */ jsxs("s-table", {
          variant: "auto",
          children: [/* @__PURE__ */ jsxs("s-table-header-row", {
            children: [/* @__PURE__ */ jsx("s-table-header", {
              listSlot: "primary",
              children: "Vencimiento"
            }), /* @__PURE__ */ jsx("s-table-header", {
              format: "numeric",
              children: "Cuota Nro"
            }), /* @__PURE__ */ jsx("s-table-header", {
              format: "numeric",
              children: "Monto Esperado"
            }), /* @__PURE__ */ jsx("s-table-header", {
              listSlot: "primary",
              children: "Estado"
            }), /* @__PURE__ */ jsx("s-table-header", {
              listSlot: "primary",
              children: "Acciones"
            })]
          }), /* @__PURE__ */ jsx("s-table-body", {
            children: credit.installments_count > 0 ? credit.installments && credit.installments.length > 0 ? credit.installments.sort((a, b) => a.number - b.number).map((inst) => {
              var _a3;
              const keystr = inst.id.toString();
              return /* @__PURE__ */ jsxs("s-table-row", {
                children: [/* @__PURE__ */ jsx("s-table-cell", {
                  children: /* @__PURE__ */ jsx(ClientDate, {
                    dateString: inst.due_date
                  })
                }), /* @__PURE__ */ jsxs("s-table-cell", {
                  children: [inst.number, " de ", credit.installments_count]
                }), /* @__PURE__ */ jsxs("s-table-cell", {
                  children: ["$", Number(inst.amount).toFixed(2)]
                }), /* @__PURE__ */ jsx("s-table-cell", {
                  children: /* @__PURE__ */ jsx("s-badge", {
                    tone: inst.status === "PENDIENTE" ? "info" : inst.status === "VENCIDO" ? "critical" : "success",
                    children: inst.status
                  })
                }), /* @__PURE__ */ jsx("s-table-cell", {
                  children: inst.status !== "PAGADA" ? /* @__PURE__ */ jsxs("s-button-group", {
                    children: [/* @__PURE__ */ jsx("s-button", {
                      variant: "secondary",
                      onClick: () => handleSendReminder(inst.id, Number(inst.amount)),
                      disabled: submittingKey === keystr || inst.status === "EN_REVISION" || statusMap[keystr] === "sent" || void 0,
                      tone: statusMap[keystr] === "error" ? "critical" : statusMap[keystr] === "sent" ? "auto" : void 0,
                      accessibilityLabel: "Enviar recordatorio de cuota",
                      children: submittingKey === keystr ? "Enviando..." : statusMap[keystr] === "sent" ? "✓ Enviado" : statusMap[keystr] === "error" ? "✕ Error" : "Enviar Recordatorio"
                    }), ((_a3 = credit.customer) == null ? void 0 : _a3.phone) && /* @__PURE__ */ jsx("s-button", {
                      variant: "secondary",
                      onClick: () => {
                        const phone = cleanPhoneForWhatsApp$1(credit.customer.phone);
                        const msg = encodeURIComponent(`Hola ${credit.customer.full_name}, le recordamos que tiene un pago pendiente de $${Number(inst.amount).toFixed(2)} correspondiente al Credito #${credit.id} (Cuota #${inst.number}). Por favor, realice su pago a la brevedad posible.`);
                        window.open(`https://wa.me/${phone}?text=${msg}`, "_blank");
                      },
                      accessibilityLabel: "Enviar recordatorio por WhatsApp",
                      children: /* @__PURE__ */ jsxs("span", {
                        style: {
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px"
                        },
                        children: [/* @__PURE__ */ jsx(WhatsAppIcon$1, {}), " WhatsApp"]
                      })
                    }), statusMap[keystr] === "sent" && /* @__PURE__ */ jsx("s-button", {
                      variant: "secondary",
                      icon: "undo",
                      onClick: () => setStatusMap((prev) => ({
                        ...prev,
                        [keystr]: "idle"
                      })),
                      accessibilityLabel: "Restablecer botón"
                    })]
                  }) : /* @__PURE__ */ jsx("s-text", {
                    color: "subdued",
                    children: "-"
                  })
                })]
              }, inst.id);
            }) : /* @__PURE__ */ jsx("s-table-row", {
              children: /* @__PURE__ */ jsx("s-table-cell", {
                children: /* @__PURE__ */ jsx("div", {
                  style: {
                    textAlign: "center"
                  },
                  children: /* @__PURE__ */ jsx("s-text", {
                    color: "subdued",
                    children: "No hay información de cuotas disponible"
                  })
                })
              })
            }) : (
              // FIADO (No installments)
              credit.balance > 0 ? /* @__PURE__ */ jsxs("s-table-row", {
                children: [/* @__PURE__ */ jsx("s-table-cell", {
                  children: "N/A"
                }), /* @__PURE__ */ jsx("s-table-cell", {
                  children: "Total (Fiado)"
                }), /* @__PURE__ */ jsxs("s-table-cell", {
                  children: ["$", remainingDebt.toFixed(2)]
                }), /* @__PURE__ */ jsx("s-table-cell", {
                  children: /* @__PURE__ */ jsx("s-badge", {
                    tone: "info",
                    children: "PENDIENTE"
                  })
                }), /* @__PURE__ */ jsx("s-table-cell", {
                  children: /* @__PURE__ */ jsxs("s-button-group", {
                    children: [/* @__PURE__ */ jsx("s-button", {
                      variant: "secondary",
                      onClick: () => handleSendReminder(null, remainingDebt),
                      disabled: submittingKey === "fiado" || payments.some((p) => p.status === "EN_REVISION") || statusMap["fiado"] === "sent" || void 0,
                      tone: statusMap["fiado"] === "error" ? "critical" : statusMap["fiado"] === "sent" ? "auto" : void 0,
                      accessibilityLabel: "Enviar recordatorio de deuda",
                      children: submittingKey === "fiado" ? "Enviando..." : statusMap["fiado"] === "sent" ? "✓ Enviado" : statusMap["fiado"] === "error" ? "✕ Error" : "Enviar Recordatorio"
                    }), ((_d = credit.customer) == null ? void 0 : _d.phone) && /* @__PURE__ */ jsx("s-button", {
                      variant: "secondary",
                      onClick: () => {
                        const phone = cleanPhoneForWhatsApp$1(credit.customer.phone);
                        const msg = encodeURIComponent(`Hola ${credit.customer.full_name}, le recordamos que tiene un pago pendiente de $${remainingDebt.toFixed(2)} correspondiente al Credito #${credit.id} (Fiado). Por favor, realice su pago a la brevedad posible.`);
                        window.open(`https://wa.me/${phone}?text=${msg}`, "_blank");
                      },
                      accessibilityLabel: "Enviar recordatorio por WhatsApp",
                      children: /* @__PURE__ */ jsxs("span", {
                        style: {
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px"
                        },
                        children: [/* @__PURE__ */ jsx(WhatsAppIcon$1, {}), " WhatsApp"]
                      })
                    }), statusMap["fiado"] === "sent" && /* @__PURE__ */ jsx("s-button", {
                      variant: "secondary",
                      icon: "undo",
                      onClick: () => setStatusMap((prev) => ({
                        ...prev,
                        "fiado": "idle"
                      })),
                      accessibilityLabel: "Restablecer botón"
                    })]
                  })
                })]
              }) : /* @__PURE__ */ jsx("s-table-row", {
                children: /* @__PURE__ */ jsx("s-table-cell", {
                  children: /* @__PURE__ */ jsx("div", {
                    style: {
                      textAlign: "center"
                    },
                    children: /* @__PURE__ */ jsx("s-text", {
                      color: "subdued",
                      children: "La deuda está saldada o no tiene balance restante."
                    })
                  })
                })
              })
            )
          })]
        })]
      }), /* @__PURE__ */ jsxs("s-section", {
        padding: "base",
        children: [/* @__PURE__ */ jsx("s-heading", {
          children: "Historial de Abonos"
        }), /* @__PURE__ */ jsxs("s-table", {
          variant: "auto",
          children: [/* @__PURE__ */ jsxs("s-table-header-row", {
            children: [/* @__PURE__ */ jsx("s-table-header", {
              listSlot: "primary",
              children: "Fecha"
            }), /* @__PURE__ */ jsx("s-table-header", {
              listSlot: "primary",
              children: "Numero de referencia"
            }), /* @__PURE__ */ jsx("s-table-header", {
              format: "numeric",
              children: "Monto Abonado"
            }), /* @__PURE__ */ jsx("s-table-header", {
              listSlot: "primary",
              children: "Estatus"
            }), /* @__PURE__ */ jsx("s-table-header", {
              listSlot: "primary",
              children: "Detalles de Pago"
            })]
          }), /* @__PURE__ */ jsx("s-table-body", {
            children: payments.length === 0 ? /* @__PURE__ */ jsx("s-table-row", {
              children: /* @__PURE__ */ jsx("s-table-cell", {
                children: /* @__PURE__ */ jsx("div", {
                  style: {
                    textAlign: "center"
                  },
                  children: /* @__PURE__ */ jsx("s-text", {
                    color: "subdued",
                    children: "Sin abonos registrados ni en revisión"
                  })
                })
              })
            }) : payments.filter((p) => {
              var _a3;
              return !((_a3 = p.reference_number) == null ? void 0 : _a3.startsWith("INTENT-"));
            }).map((p) => /* @__PURE__ */ jsxs("s-table-row", {
              children: [/* @__PURE__ */ jsx("s-table-cell", {
                children: /* @__PURE__ */ jsx(ClientDate, {
                  dateString: p.payment_date
                })
              }), /* @__PURE__ */ jsx("s-table-cell", {
                children: p.reference_number || "N/A"
              }), /* @__PURE__ */ jsxs("s-table-cell", {
                children: ["$", Number(p.amount).toFixed(2)]
              }), /* @__PURE__ */ jsx("s-table-cell", {
                children: /* @__PURE__ */ jsx("s-badge", {
                  tone: p.status === "APROBADO" ? "success" : p.status === "EN_REVISION" ? "warning" : "neutral",
                  children: p.status
                })
              }), /* @__PURE__ */ jsx("s-table-cell", {
                children: /* @__PURE__ */ jsx("s-link", {
                  href: `/app/payment_detail/${p.id}`,
                  children: "Ver Pago"
                })
              })]
            }, p.id))
          })]
        })]
      }), /* @__PURE__ */ jsxs("s-section", {
        padding: "base",
        children: [/* @__PURE__ */ jsx("s-heading", {
          children: "Lista de Productos"
        }), /* @__PURE__ */ jsxs("s-table", {
          variant: "auto",
          children: [/* @__PURE__ */ jsxs("s-table-header-row", {
            children: [/* @__PURE__ */ jsx("s-table-header", {
              listSlot: "primary",
              children: "Codigo de Producto"
            }), /* @__PURE__ */ jsx("s-table-header", {
              listSlot: "primary",
              children: "Fecha"
            }), /* @__PURE__ */ jsx("s-table-header", {
              listSlot: "primary",
              children: "Productos"
            }), /* @__PURE__ */ jsx("s-table-header", {
              format: "numeric",
              children: "Monto"
            }), /* @__PURE__ */ jsx("s-table-header", {
              listSlot: "primary",
              children: "Metodo de Pago"
            })]
          }), /* @__PURE__ */ jsx("s-table-body", {
            children: !credit.items || credit.items.length === 0 ? /* @__PURE__ */ jsx("s-table-row", {
              children: /* @__PURE__ */ jsx("s-table-cell", {
                children: /* @__PURE__ */ jsx("div", {
                  style: {
                    textAlign: "center"
                  },
                  children: /* @__PURE__ */ jsx("s-text", {
                    color: "subdued",
                    children: "No hay productos vinculados"
                  })
                })
              })
            }) : credit.items.map((item, idx) => {
              var _a3;
              return /* @__PURE__ */ jsxs("s-table-row", {
                children: [/* @__PURE__ */ jsx("s-table-cell", {
                  children: item.product_code || ((_a3 = item.product_id) == null ? void 0 : _a3.split("/").pop()) || "N/A"
                }), /* @__PURE__ */ jsx("s-table-cell", {
                  children: /* @__PURE__ */ jsx(ClientDate, {
                    dateString: credit.created_at
                  })
                }), /* @__PURE__ */ jsx("s-table-cell", {
                  children: item.product_name
                }), /* @__PURE__ */ jsxs("s-table-cell", {
                  children: ["$", Number(item.total_price).toFixed(2)]
                }), /* @__PURE__ */ jsx("s-table-cell", {
                  children: /* @__PURE__ */ jsx("s-badge", {
                    tone: credit.status === "PAGADO" ? "success" : "warning",
                    children: credit.status === "PAGADO" ? "Realizado" : "Crédito"
                  })
                })]
              }, idx);
            })
          })]
        })]
      })]
    }), /* @__PURE__ */ jsxs("s-stack", {
      padding: "base",
      alignItems: "center",
      gap: "base",
      children: [/* @__PURE__ */ jsx("s-text", {
        color: "subdued",
        children: "Desarrollado por Opentech LCC"
      }), /* @__PURE__ */ jsxs("s-text", {
        children: ["¿Tienes alguna duda?", " ", /* @__PURE__ */ jsx("s-link", {
          href: "https://lccopen.tech/contact",
          target: "_blank",
          children: "Contáctanos"
        }), "."]
      })]
    })]
  });
});
const route8 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$8,
  default: app_credit_detail_$id,
  loader: loader$9
}, Symbol.toStringTag, { value: "Module" }));
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";
const cleanPhoneForWhatsApp = (phone) => {
  return phone.replace(/[^0-9]/g, "");
};
const WhatsAppIcon = () => /* @__PURE__ */ jsx("svg", {
  xmlns: "http://www.w3.org/2000/svg",
  viewBox: "0 0 448 512",
  width: "16",
  height: "16",
  fill: "#25D366",
  style: {
    verticalAlign: "middle"
  },
  children: /* @__PURE__ */ jsx("path", {
    d: "M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7.9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z"
  })
});
const loader$8 = async ({
  request
}) => {
  const {
    session
  } = await authenticate.admin(request);
  const accessToken = await getAccessTokenForShop(session.shop);
  if (!accessToken) throw new Error("Token no disponible");
  const res = await fetch(`${BACKEND_URL}/api/payments/expected`, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });
  if (!res.ok) throw new Error("Error fetching expected payments");
  const payments = await res.json();
  return {
    payments
  };
};
const action$7 = async ({
  request
}) => {
  const {
    session
  } = await authenticate.admin(request);
  const accessToken = await getAccessTokenForShop(session.shop);
  const formData = await request.formData();
  const intent = formData.get("intent");
  if (intent === "send_reminder") {
    const key = formData.get("key");
    const body = {
      credit_id: Number(formData.get("credit_id")),
      installment_id: formData.get("installment_id") ? Number(formData.get("installment_id")) : null,
      amount: Number(formData.get("amount")),
      customer_email: formData.get("customer_email")
    };
    const res = await fetch(`${BACKEND_URL}/api/payments/payment-tokens`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`
      },
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      return {
        error: "No se pudo enviar",
        key
      };
    }
    return {
      success: true,
      key
    };
  }
  return null;
};
const headers$7 = () => ({
  "Cache-Control": "no-cache, no-store, must-revalidate"
});
const app_expected_payments = UNSAFE_withComponentProps(function ExpectedPayments() {
  var _a2;
  const {
    payments
  } = useLoaderData();
  const submit = useSubmit();
  const navigation = useNavigation();
  const actionData = useActionData();
  const [statusMap, setStatusMap] = useState({});
  useEffect(() => {
    if (actionData == null ? void 0 : actionData.key) {
      const state = actionData.success ? "sent" : "error";
      setStatusMap((prev) => ({
        ...prev,
        [actionData.key]: state
      }));
    }
  }, [actionData]);
  const loading = navigation.state === "loading" || navigation.state === "submitting";
  const submittingKey = (_a2 = navigation.formData) == null ? void 0 : _a2.get("key");
  const handleSendReminder = (payment) => {
    let email = payment.customer_email;
    if (!email) {
      const promptedEmail = window.prompt("El cliente no tiene email registrado. Por favor, ingréselo para enviar el recordatorio:");
      if (!promptedEmail || !promptedEmail.includes("@")) {
        alert("Email no válido operacion cancelada.");
        return;
      }
      email = promptedEmail;
    }
    const key = payment.installment_id ? `${payment.credit_id}-${payment.installment_id}` : `${payment.credit_id}-fiado`;
    submit({
      intent: "send_reminder",
      key,
      credit_id: payment.credit_id.toString(),
      installment_id: payment.installment_id ? payment.installment_id.toString() : "",
      amount: payment.expected_amount.toString(),
      customer_email: email
    }, {
      method: "post"
    });
  };
  const getStatusTone = (status) => {
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
  return /* @__PURE__ */ jsx("s-page", {
    heading: "Pagos Esperados",
    inlineSize: "large",
    children: /* @__PURE__ */ jsxs("s-section", {
      padding: "base",
      children: [/* @__PURE__ */ jsx("s-heading", {
        children: "Cuotas y Saldos por Cobrar"
      }), /* @__PURE__ */ jsx("s-text", {
        color: "subdued",
        children: "Visualiza las cuotas pendientes de todos los créditos activos y envía recordatorios de pago."
      }), /* @__PURE__ */ jsx("s-box", {
        paddingBlockStart: "base",
        children: /* @__PURE__ */ jsxs("s-table", {
          loading: loading || void 0,
          children: [/* @__PURE__ */ jsxs("s-table-header-row", {
            children: [/* @__PURE__ */ jsx("s-table-header", {
              format: "numeric",
              children: "Crédito ID"
            }), /* @__PURE__ */ jsx("s-table-header", {
              children: "Cliente"
            }), /* @__PURE__ */ jsx("s-table-header", {
              children: "Vencimiento"
            }), /* @__PURE__ */ jsx("s-table-header", {
              format: "numeric",
              children: "Nro Cuota"
            }), /* @__PURE__ */ jsx("s-table-header", {
              format: "numeric",
              children: "Monto Esperado"
            }), /* @__PURE__ */ jsx("s-table-header", {
              children: "Estado"
            }), /* @__PURE__ */ jsx("s-table-header", {
              children: "Acciones"
            })]
          }), /* @__PURE__ */ jsxs("s-table-body", {
            children: [payments.map((payment) => {
              const key = payment.installment_id ? `${payment.credit_id}-${payment.installment_id}` : `${payment.credit_id}-fiado`;
              return /* @__PURE__ */ jsxs("s-table-row", {
                children: [/* @__PURE__ */ jsx("s-table-cell", {
                  children: payment.credit_id
                }), /* @__PURE__ */ jsx("s-table-cell", {
                  children: /* @__PURE__ */ jsxs("s-stack", {
                    gap: "none",
                    children: [/* @__PURE__ */ jsx("s-text", {
                      type: "strong",
                      children: payment.customer_name
                    }), /* @__PURE__ */ jsx("s-text", {
                      color: "subdued",
                      children: payment.customer_email || "Sin email"
                    }), payment.customer_phone && /* @__PURE__ */ jsxs("s-text", {
                      color: "subdued",
                      children: ["Tel: ", payment.customer_phone]
                    })]
                  })
                }), /* @__PURE__ */ jsx("s-table-cell", {
                  children: payment.due_date ? /* @__PURE__ */ jsx(ClientDate, {
                    dateString: payment.due_date
                  }) : "Pendiente"
                }), /* @__PURE__ */ jsx("s-table-cell", {
                  children: payment.installment_number ? payment.installment_number : "Fiado (Total)"
                }), /* @__PURE__ */ jsxs("s-table-cell", {
                  children: ["$", payment.expected_amount.toFixed(2)]
                }), /* @__PURE__ */ jsx("s-table-cell", {
                  children: /* @__PURE__ */ jsx("s-badge", {
                    tone: getStatusTone(payment.status),
                    children: payment.status
                  })
                }), /* @__PURE__ */ jsx("s-table-cell", {
                  children: /* @__PURE__ */ jsxs("s-button-group", {
                    children: [/* @__PURE__ */ jsx("s-button", {
                      slot: "secondary-actions",
                      icon: "view",
                      href: `/app/credit_detail/${payment.credit_id}`,
                      accessibilityLabel: "Ver detalles de cuota",
                      children: "Ver Detalles"
                    }), /* @__PURE__ */ jsx("s-button", {
                      slot: "secondary-actions",
                      tone: "auto",
                      disabled: submittingKey === key || payment.status === "EN_REVISION" || statusMap[key] === "sent" || void 0,
                      onClick: () => handleSendReminder(payment),
                      accessibilityLabel: "Enviar recordatorio de pago",
                      children: submittingKey === key ? "Enviando..." : statusMap[key] === "sent" ? "¡Enviado!" : statusMap[key] === "error" ? "Reintentar" : "Enviar Recordatorio"
                    }), payment.customer_phone && /* @__PURE__ */ jsx("s-button", {
                      slot: "secondary-actions",
                      onClick: () => {
                        const phone = cleanPhoneForWhatsApp(payment.customer_phone);
                        const msg = encodeURIComponent(`Hola ${payment.customer_name}, le recordamos que tiene un pago pendiente de $${payment.expected_amount.toFixed(2)} correspondiente al Credito #${payment.credit_id}${payment.installment_number ? ` (Cuota #${payment.installment_number})` : " (Fiado)"}. Por favor, realice su pago a la brevedad posible.`);
                        window.open(`https://wa.me/${phone}?text=${msg}`, "_blank");
                      },
                      accessibilityLabel: "Enviar recordatorio por WhatsApp",
                      children: /* @__PURE__ */ jsxs("span", {
                        style: {
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px"
                        },
                        children: [/* @__PURE__ */ jsx(WhatsAppIcon, {}), " WhatsApp"]
                      })
                    }), statusMap[key] === "sent" && /* @__PURE__ */ jsx("s-button", {
                      slot: "secondary-actions",
                      icon: "undo",
                      onClick: () => setStatusMap((prev) => ({
                        ...prev,
                        [key]: "idle"
                      })),
                      accessibilityLabel: "Restablecer botón de recordatorio"
                    })]
                  })
                })]
              }, key);
            }), !loading && payments.length === 0 && /* @__PURE__ */ jsx("s-table-row", {
              children: /* @__PURE__ */ jsx("s-table-cell", {
                children: /* @__PURE__ */ jsx("div", {
                  style: {
                    textAlign: "center",
                    gridColumn: "span 7"
                  },
                  children: /* @__PURE__ */ jsx("s-text", {
                    color: "subdued",
                    children: "No hay pagos esperados en este momento."
                  })
                })
              })
            })]
          })]
        })
      })]
    })
  });
});
const ErrorBoundary3 = UNSAFE_withErrorBoundaryProps(function ErrorBoundary4() {
  const error = useRouteError();
  const errorMessage = isRouteErrorResponse(error) ? `${error.status} ${error.statusText}` : error instanceof Error ? error.message : "Ocurrió un error inesperado al conectar con el servidor.";
  return /* @__PURE__ */ jsx("s-page", {
    heading: "Error",
    inlineSize: "large",
    children: /* @__PURE__ */ jsx("s-section", {
      padding: "base",
      children: /* @__PURE__ */ jsxs("s-banner", {
        tone: "critical",
        heading: "Ha ocurrido un problema",
        children: [/* @__PURE__ */ jsx("p", {
          children: errorMessage
        }), /* @__PURE__ */ jsx("p", {
          style: {
            marginTop: "10px"
          },
          children: "Por favor, reintenta más tarde o revisa tu conexión."
        })]
      })
    })
  });
});
const route9 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  ErrorBoundary: ErrorBoundary3,
  action: action$7,
  default: app_expected_payments,
  headers: headers$7,
  loader: loader$8
}, Symbol.toStringTag, { value: "Module" }));
const loader$7 = async ({
  request
}) => {
  var _a2;
  const {
    admin,
    session
  } = await authenticate.admin(request);
  const response = await admin.graphql(`
    {
      customers(first: 50) {
        nodes {
          id
          displayName
          email
          phone
          numberOfOrders
          createdAt
          metafields(first: 20) {
            nodes {
              key
              value
            }
          }
        }
      }
    }
  `);
  const {
    data
  } = await response.json();
  const rawCustomers = ((_a2 = data == null ? void 0 : data.customers) == null ? void 0 : _a2.nodes) ?? [];
  const customers = rawCustomers.map((c) => {
    var _a3;
    const mfs = ((_a3 = c.metafields) == null ? void 0 : _a3.nodes) || [];
    let docTypeVal = "";
    let docNumVal = "";
    for (const mf of mfs) {
      const val = mf.value || "";
      const key = mf.key.toLowerCase();
      if (!docTypeVal && (key.includes("tipo") || key.includes("doc"))) {
        try {
          const parsed = JSON.parse(val);
          if (Array.isArray(parsed) && parsed.length > 0) docTypeVal = parsed[0];
          else docTypeVal = val;
        } catch {
          docTypeVal = val;
        }
      }
      if (!docNumVal && (key === "n" || key.includes("num") || key.includes("n_") || key.includes("doc") && !key.includes("tipo"))) {
        docNumVal = val;
      }
    }
    return {
      ...c,
      metafield_doc_type: {
        value: docTypeVal
      },
      metafield_doc_num: {
        value: docNumVal
      }
    };
  });
  let favorableBalanceMap = {};
  let reputationMap = {};
  let statsMap = {};
  const BACKEND_URL2 = process.env.BACKEND_URL || "http://localhost:8000";
  try {
    let accessToken = await getAccessTokenForShop(session.shop);
    if (accessToken) {
      const backendRes = await fetch(`${BACKEND_URL2}/api/customers?limit=200`, {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });
      if (backendRes.ok) {
        const backendCustomers = await backendRes.json();
        for (const bc of backendCustomers) {
          if (bc.shopify_customer_id != null) {
            favorableBalanceMap[bc.shopify_customer_id] = Number(bc.favorable_balance);
            reputationMap[bc.shopify_customer_id] = {
              score: bc.punctuality_score,
              label: bc.reputation
            };
            statsMap[bc.shopify_customer_id] = {
              credits_completed: bc.credits_completed ?? 0,
              credits_incomplete: bc.credits_incomplete ?? 0,
              payments_on_time: bc.payments_on_time ?? 0,
              payments_late: bc.payments_late ?? 0,
              payments_incomplete: bc.payments_incomplete ?? 0
            };
          }
        }
      }
    }
  } catch (e) {
    console.error("[shopify_customers] Failed to fetch backend customers:", e);
  }
  return {
    customers,
    favorableBalanceMap,
    reputationMap,
    statsMap
  };
};
const action$6 = async ({
  request
}) => {
  const {
    session
  } = await authenticate.admin(request);
  const accessToken = await getAccessTokenForShop(session.shop);
  const formData = await request.formData();
  const shopifyNumericId = formData.get("shopifyNumericId");
  const intent = formData.get("intent");
  if (intent === "reset-balance" && shopifyNumericId) {
    const BACKEND_URL2 = process.env.BACKEND_URL || "http://localhost:8000";
    try {
      const res = await fetch(`${BACKEND_URL2}/api/customers/shopify/${shopifyNumericId}/reset-balance`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });
      if (!res.ok) return {
        error: "Error al resetear balance"
      };
      return {
        success: true
      };
    } catch {
      return {
        error: "Error de red"
      };
    }
  }
  return null;
};
const headers$6 = () => ({
  "Cache-Control": "no-cache, no-store, must-revalidate"
});
const app_shopify_customers = UNSAFE_withComponentProps(function ShopifyCustomers() {
  const {
    customers,
    favorableBalanceMap,
    reputationMap,
    statsMap
  } = useLoaderData();
  const submit = useSubmit();
  useNavigation();
  const [resetting, setResetting] = useState({});
  const handleResetBalance = (shopifyNumericId) => {
    if (!window.confirm("¿Estás seguro de que deseas vaciar el saldo a favor de este cliente? Esta acción no se puede deshacer.")) {
      return;
    }
    submit({
      intent: "reset-balance",
      shopifyNumericId: String(shopifyNumericId)
    }, {
      method: "post"
    });
  };
  const reputationBadge = (label2) => {
    const config = {
      excelente: {
        tone: "success",
        emoji: "⭐",
        text: "Excelente"
      },
      buena: {
        tone: "info",
        emoji: "👍",
        text: "Buena"
      },
      regular: {
        tone: "attention",
        emoji: "⚠️",
        text: "Regular"
      },
      mala: {
        tone: "critical",
        emoji: "❌",
        text: "Mala"
      },
      sin_historial: {
        tone: "",
        emoji: "—",
        text: "Sin historial"
      }
    };
    const c = config[label2 ?? "sin_historial"] ?? config["sin_historial"];
    if (!c.tone) return /* @__PURE__ */ jsx("s-text", {
      color: "subdued",
      children: c.emoji
    });
    const badgeTone = c.tone || "info";
    return /* @__PURE__ */ jsxs("s-badge", {
      tone: badgeTone,
      children: [c.emoji, " ", c.text]
    });
  };
  const getShopifyNumericId = (gid) => {
    const parts = gid.split("/");
    return parseInt(parts[parts.length - 1], 10);
  };
  const totalRegistrados = customers.length;
  const operacionesActivas = Object.values(statsMap).filter((s) => s.credits_incomplete > 0).length;
  const clientesMorosos = Object.values(statsMap).filter((s) => s.payments_late > 0).length;
  const pagosPendientes = Object.values(statsMap).reduce((acc, curr) => acc + curr.payments_late, 0);
  const pagosCompletados = Object.values(statsMap).reduce((acc, curr) => acc + curr.payments_on_time, 0);
  return /* @__PURE__ */ jsx("s-page", {
    heading: "Clientes de Shopify",
    children: /* @__PURE__ */ jsxs("s-stack", {
      gap: "large",
      children: [/* @__PURE__ */ jsx("s-grid", {
        gridTemplateColumns: "repeat(5, 1fr)",
        gap: "small",
        padding: "base",
        children: /* @__PURE__ */ jsxs("s-grid-item", {
          gridColumn: "span 5",
          children: [/* @__PURE__ */ jsx("s-section", {
            children: /* @__PURE__ */ jsxs("s-stack", {
              alignItems: "center",
              gap: "small-200",
              children: [/* @__PURE__ */ jsx("s-text", {
                color: "subdued",
                children: "Total de clientes registrados"
              }), /* @__PURE__ */ jsx("s-heading", {
                children: totalRegistrados
              })]
            })
          }), /* @__PURE__ */ jsx("s-section", {
            children: /* @__PURE__ */ jsxs("s-stack", {
              alignItems: "center",
              gap: "small-200",
              children: [/* @__PURE__ */ jsx("s-text", {
                color: "subdued",
                children: "Clientes con Operaciones Activas"
              }), /* @__PURE__ */ jsx("s-heading", {
                children: operacionesActivas
              })]
            })
          }), /* @__PURE__ */ jsx("s-section", {
            children: /* @__PURE__ */ jsxs("s-stack", {
              alignItems: "center",
              gap: "small-200",
              children: [/* @__PURE__ */ jsx("s-text", {
                color: "subdued",
                children: "Clientes Morosos"
              }), /* @__PURE__ */ jsx("s-heading", {
                children: clientesMorosos
              })]
            })
          }), /* @__PURE__ */ jsx("s-section", {
            children: /* @__PURE__ */ jsxs("s-stack", {
              alignItems: "center",
              gap: "small-200",
              children: [/* @__PURE__ */ jsx("s-text", {
                color: "subdued",
                children: "Número de pagos pendientes"
              }), /* @__PURE__ */ jsx("s-heading", {
                children: pagosPendientes
              })]
            })
          }), /* @__PURE__ */ jsx("s-section", {
            children: /* @__PURE__ */ jsxs("s-stack", {
              alignItems: "center",
              gap: "small-200",
              children: [/* @__PURE__ */ jsx("s-text", {
                color: "subdued",
                children: "Número de pagos completados"
              }), /* @__PURE__ */ jsx("s-heading", {
                children: pagosCompletados
              })]
            })
          })]
        })
      }), /* @__PURE__ */ jsx("s-section", {
        padding: "base",
        accessibilityLabel: "Lista de Clientes Shopify",
        children: customers.length === 0 ? /* @__PURE__ */ jsx("s-text", {
          color: "subdued",
          children: "No hay clientes registrados en esta tienda."
        }) : /* @__PURE__ */ jsxs("s-table", {
          children: [/* @__PURE__ */ jsxs("s-table-header-row", {
            children: [/* @__PURE__ */ jsx("s-table-header", {
              listSlot: "primary",
              children: "Nombre"
            }), /* @__PURE__ */ jsx("s-table-header", {
              children: "Documento"
            }), /* @__PURE__ */ jsx("s-table-header", {
              children: "Email"
            }), /* @__PURE__ */ jsx("s-table-header", {
              children: "Teléfono"
            }), /* @__PURE__ */ jsx("s-table-header", {
              format: "numeric",
              children: "Órdenes"
            }), /* @__PURE__ */ jsx("s-table-header", {
              listSlot: "primary",
              format: "numeric",
              children: "Saldo a Favor"
            }), /* @__PURE__ */ jsx("s-table-header", {
              children: "Reputación"
            }), /* @__PURE__ */ jsx("s-table-header", {
              format: "numeric",
              children: "Créd. Completados"
            }), /* @__PURE__ */ jsx("s-table-header", {
              format: "numeric",
              children: "Créd. Pendientes"
            }), /* @__PURE__ */ jsx("s-table-header", {
              format: "numeric",
              children: "Pagos a Tiempo"
            }), /* @__PURE__ */ jsx("s-table-header", {
              format: "numeric",
              children: "Pagos Tardíos"
            }), /* @__PURE__ */ jsx("s-table-header", {
              format: "numeric",
              children: "Pagos No Completados"
            }), /* @__PURE__ */ jsx("s-table-header", {
              children: "Acciones"
            })]
          }), /* @__PURE__ */ jsx("s-table-body", {
            children: customers.map((customer) => {
              var _a2, _b, _c;
              const numericId = getShopifyNumericId(customer.id);
              const saldo = favorableBalanceMap[numericId];
              const hasSaldo = saldo != null && saldo > 0;
              const stats = statsMap[numericId];
              const docType = ((_a2 = customer.metafield_doc_type) == null ? void 0 : _a2.value) || "";
              const docNum = ((_b = customer.metafield_doc_num) == null ? void 0 : _b.value) || "";
              const displayDoc = docType && docNum ? `${docType}-${docNum}` : "—";
              return /* @__PURE__ */ jsxs("s-table-row", {
                children: [/* @__PURE__ */ jsx("s-table-cell", {
                  children: /* @__PURE__ */ jsx("s-text", {
                    children: customer.displayName
                  })
                }), /* @__PURE__ */ jsx("s-table-cell", {
                  children: /* @__PURE__ */ jsx("s-text", {
                    children: displayDoc
                  })
                }), /* @__PURE__ */ jsx("s-table-cell", {
                  children: /* @__PURE__ */ jsx("s-text", {
                    children: customer.email ?? "—"
                  })
                }), /* @__PURE__ */ jsx("s-table-cell", {
                  children: /* @__PURE__ */ jsx("s-text", {
                    children: customer.phone ?? "—"
                  })
                }), /* @__PURE__ */ jsx("s-table-cell", {
                  children: customer.numberOfOrders
                }), /* @__PURE__ */ jsx("s-table-cell", {
                  children: hasSaldo ? /* @__PURE__ */ jsxs("s-badge", {
                    tone: "success",
                    children: ["$", saldo.toFixed(2)]
                  }) : /* @__PURE__ */ jsx("s-text", {
                    color: "subdued",
                    children: "—"
                  })
                }), /* @__PURE__ */ jsx("s-table-cell", {
                  children: reputationBadge(((_c = reputationMap[numericId]) == null ? void 0 : _c.label) ?? null)
                }), /* @__PURE__ */ jsx("s-table-cell", {
                  children: stats ? stats.credits_completed > 0 ? /* @__PURE__ */ jsx("s-badge", {
                    tone: "success",
                    children: stats.credits_completed
                  }) : /* @__PURE__ */ jsx("s-text", {
                    color: "subdued",
                    children: "0"
                  }) : /* @__PURE__ */ jsx("s-text", {
                    color: "subdued",
                    children: "—"
                  })
                }), /* @__PURE__ */ jsx("s-table-cell", {
                  children: stats ? stats.credits_incomplete > 0 ? /* @__PURE__ */ jsx("s-badge", {
                    tone: "warning",
                    children: stats.credits_incomplete
                  }) : /* @__PURE__ */ jsx("s-text", {
                    color: "subdued",
                    children: "0"
                  }) : /* @__PURE__ */ jsx("s-text", {
                    color: "subdued",
                    children: "—"
                  })
                }), /* @__PURE__ */ jsx("s-table-cell", {
                  children: stats ? stats.payments_on_time > 0 ? /* @__PURE__ */ jsx("s-badge", {
                    tone: "success",
                    children: stats.payments_on_time
                  }) : /* @__PURE__ */ jsx("s-text", {
                    color: "subdued",
                    children: "0"
                  }) : /* @__PURE__ */ jsx("s-text", {
                    color: "subdued",
                    children: "—"
                  })
                }), /* @__PURE__ */ jsx("s-table-cell", {
                  children: stats ? stats.payments_late > 0 ? /* @__PURE__ */ jsx("s-badge", {
                    tone: "critical",
                    children: stats.payments_late
                  }) : /* @__PURE__ */ jsx("s-text", {
                    color: "subdued",
                    children: "0"
                  }) : /* @__PURE__ */ jsx("s-text", {
                    color: "subdued",
                    children: "—"
                  })
                }), /* @__PURE__ */ jsx("s-table-cell", {
                  children: stats ? stats.payments_incomplete > 0 ? /* @__PURE__ */ jsx("s-badge", {
                    tone: "warning",
                    children: stats.payments_incomplete
                  }) : /* @__PURE__ */ jsx("s-text", {
                    color: "subdued",
                    children: "0"
                  }) : /* @__PURE__ */ jsx("s-text", {
                    color: "subdued",
                    children: "—"
                  })
                }), /* @__PURE__ */ jsx("s-table-cell", {
                  children: /* @__PURE__ */ jsxs("s-stack", {
                    direction: "inline",
                    gap: "small-100",
                    alignItems: "center",
                    justifyContent: "center",
                    children: [hasSaldo && /* @__PURE__ */ jsx("s-button", {
                      id: `reset-balance-${numericId}`,
                      tone: "critical",
                      onClick: () => handleResetBalance(numericId),
                      disabled: resetting[numericId],
                      accessibilityLabel: "Vaciar saldo a favor del cliente",
                      children: "Vaciar Saldo"
                    }), /* @__PURE__ */ jsx("s-button", {
                      href: `/app/customer_detail/${numericId}`,
                      accessibilityLabel: "Ver detalles del cliente",
                      children: "Ver cliente"
                    })]
                  })
                })]
              }, customer.id);
            })
          })]
        })
      }), /* @__PURE__ */ jsxs("s-stack", {
        padding: "base",
        alignItems: "center",
        gap: "base",
        children: [/* @__PURE__ */ jsx("s-text", {
          color: "subdued",
          children: "Desarrollado por Opentech LCC"
        }), /* @__PURE__ */ jsxs("s-text", {
          children: ["¿Tienes alguna duda?", " ", /* @__PURE__ */ jsx("s-link", {
            href: "https://lccopen.tech/contact",
            target: "_blank",
            children: "Contáctanos"
          }), "."]
        })]
      })]
    })
  });
});
const route10 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$6,
  default: app_shopify_customers,
  headers: headers$6,
  loader: loader$7
}, Symbol.toStringTag, { value: "Module" }));
const SPREADSHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQqrzXGB4grT2FhonRlj3jZVC3E9sSaZl9gkgd0nSrwtA55E_Fcy7Q3QDCO8lTMlDS_D21wgDGaXJ1x/pub?output=csv";
const loader$6 = async ({
  request
}) => {
  var _a2;
  const {
    admin,
    session
  } = await authenticate.admin(request);
  const url = new URL(request.url);
  let tasaBcv = null;
  let tasaFecha = null;
  if (!url.searchParams.has("searchCredits")) {
    try {
      const csvRes = await fetch(SPREADSHEET_CSV_URL);
      if (csvRes.ok) {
        const text2 = await csvRes.text();
        const lines = text2.trim().split("\n").filter((l) => l.trim());
        const lastLine = lines[lines.length - 1];
        const match = lastLine.match(/"([\d.,]+)\s*Bs\."/);
        if (match) {
          tasaBcv = parseFloat(match[1].replace(".", "").replace(",", "."));
        }
        const dateMatch = lastLine.match(/(\d{1,2}\/\d{2}\/\d{4})/);
        if (dateMatch) {
          tasaFecha = dateMatch[1];
        }
      }
    } catch (e) {
      console.error("[registre_payment] Failed to fetch BCV rate:", e);
    }
  }
  if (url.searchParams.has("searchCredits")) {
    const accessToken = await getAccessTokenForShop(session.shop);
    const searchCustomer = url.searchParams.get("customer_id");
    const searchCreditId = url.searchParams.get("credit_id");
    const searchDate = url.searchParams.get("created_at_date");
    const BACKEND_URL2 = process.env.BACKEND_URL || "http://localhost:8000";
    let apiUrl = `${BACKEND_URL2}/api/credits?status=EMITIDO&status=PENDIENTE_ACTIVACION&status=EN_PROGRESO`;
    if (searchCustomer) apiUrl += `&customer_id=${searchCustomer}`;
    if (searchCreditId) apiUrl += `&credit_id=${searchCreditId}`;
    if (searchDate) apiUrl += `&created_at_date=${searchDate}`;
    try {
      const response2 = await fetch(apiUrl, {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });
      if (response2.ok) {
        const data2 = await response2.json();
        return {
          credits: data2
        };
      }
    } catch {
      return {
        credits: []
      };
    }
    return {
      credits: []
    };
  }
  const response = await admin.graphql(`
    {
      customers(first: 50) {
        nodes {
          id
          displayName
          email
          phone
        }
      }
    }
  `);
  const {
    data
  } = await response.json();
  const customers = ((_a2 = data == null ? void 0 : data.customers) == null ? void 0 : _a2.nodes) ?? [];
  return {
    customers,
    tasaBcv,
    tasaFecha
  };
};
const action$5 = async ({
  request
}) => {
  const {
    session
  } = await authenticate.admin(request);
  const formData = await request.formData();
  const paymentDataStr = formData.get("paymentData");
  if (!paymentDataStr) return {
    error: "No se recibieron datos de pago."
  };
  const paymentData = JSON.parse(paymentDataStr);
  const {
    installments,
    useFavorableBalance,
    notes,
    paymentDate,
    approvalStatus
    // "APROBADO" | "EN_REVISION"
  } = paymentData;
  const methodMap = {
    "Dolares en efectivo": "CASH",
    "Bolivares en efectivo": "EFECTIVO",
    "Pago movil": "PAGO_MOVIL",
    Transferencia: "BANK",
    Binance: "BINANCE",
    Zelle: "ZELLE",
    Zinli: "ZINLI",
    Debito: "DEBITO"
  };
  const accessToken = await getAccessTokenForShop(session.shop);
  if (!accessToken) return {
    error: "No se pudo obtener el token de acceso."
  };
  try {
    const payload = {
      credit_id: installments[0].creditId,
      apply_to_installments: installments.map((i) => i.id).filter((id) => id > 0),
      distribute_excess: paymentData.distributeExcess,
      amount: paymentData.amount,
      payment_method: methodMap[paymentData.method] || methodMap["Dolares en efectivo"],
      reference_number: paymentData.reference || `EFECTIVO-${Date.now()}`,
      payment_date: new Date(paymentDate).toISOString(),
      use_favorable_balance: useFavorableBalance || false,
      notes: notes || void 0,
      punctuality_feedback: paymentData.punctualityFeedback ?? void 0
    };
    const BACKEND_URL2 = process.env.BACKEND_URL || "http://localhost:8000";
    const res = await fetch(`${BACKEND_URL2}/api/payments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`
      },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      const detailStr = typeof body.detail === "object" ? JSON.stringify(body.detail) : body.detail || res.statusText;
      return {
        error: `Error procesando pago: ${detailStr}`
      };
    }
    const created = await res.json().catch(() => null);
    if ((approvalStatus === "APROBADO" || approvalStatus === "NO_PAGADO") && (created == null ? void 0 : created.id)) {
      await fetch(`${BACKEND_URL2}/api/payments/batch-review`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          payment_ids: [created.id],
          status: approvalStatus
        })
      });
    }
  } catch (error) {
    console.error("Action error:", error);
    return {
      error: "Error de conexión al procesar el pago."
    };
  }
  return redirect("/app/payments");
};
const headers$5 = () => ({
  "Cache-Control": "no-cache, no-store, must-revalidate"
});
const app_registre_payment = UNSAFE_withComponentProps(function RegistrePayment() {
  const {
    customers = [],
    tasaBcv,
    tasaFecha
  } = useLoaderData();
  const actionData = useActionData();
  const submit = useSubmit();
  const navigation = useNavigation();
  const isSubmitting = navigation.state !== "idle";
  const [actionError, setActionError] = useState(null);
  useEffect(() => {
    if (actionData == null ? void 0 : actionData.error) setActionError(actionData.error);
  }, [actionData]);
  useEffect(() => {
    if (navigation.state === "loading") {
      setActionError(null);
    }
  }, [navigation.state]);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [searchCreditId, setSearchCreditId] = useState("");
  const [searchDate, setSearchDate] = useState("");
  const [credits, setCredits] = useState([]);
  const creditsFetcher = useFetcher();
  const isLoadingCredits = creditsFetcher.state !== "idle";
  const [paymentForm, setPaymentForm] = useState({
    date: "",
    exchangeRate: "100",
    method: "Dolares en efectivo",
    amount: "0",
    reference: "",
    notes: "",
    autoSelect: false,
    fiadoFeedback: ""
    // Promedio reputacion... "" = no aplica, "100" = puntual, "50" = retrasado, "0" = no pagó
  });
  useEffect(() => {
    const now = /* @__PURE__ */ new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    setPaymentForm((prev) => ({
      ...prev,
      date: `${y}-${m}-${d}`,
      exchangeRate: tasaBcv ? String(tasaBcv) : prev.exchangeRate
    }));
  }, [tasaBcv]);
  const isVesMethod = paymentForm.method === "Pago movil" || paymentForm.method === "Transferencia" || paymentForm.method === "Bolivares en efectivo";
  const effectiveTasa = Number(paymentForm.exchangeRate);
  const isManualTasa = tasaBcv === null || effectiveTasa !== tasaBcv;
  const montoUsd = Number(paymentForm.amount) || 0;
  const montoVes = !isNaN(effectiveTasa) && montoUsd ? montoUsd * effectiveTasa : null;
  const [selectedInstallments, setSelectedInstallments] = useState({});
  const [useFavorableBalance, setUseFavorableBalance] = useState(false);
  const [distributeExcess, setDistributeExcess] = useState(true);
  const [approvalStatus, setApprovalStatus] = useState("APROBADO");
  useEffect(() => {
    setSelectedInstallments({});
    if (!selectedCustomerId && !searchCreditId && !searchDate) {
      setCredits([]);
      return;
    }
    const timer = setTimeout(() => {
      let params = new URLSearchParams({
        searchCredits: "1"
      });
      if (selectedCustomerId) params.append("customer_id", selectedCustomerId.split("/").pop());
      if (searchCreditId) params.append("credit_id", searchCreditId);
      if (searchDate) params.append("created_at_date", searchDate);
      creditsFetcher.load(`/app/registre_payment?${params.toString()}`);
    }, 300);
    return () => clearTimeout(timer);
  }, [selectedCustomerId, searchCreditId, searchDate]);
  useEffect(() => {
    var _a2;
    if ((_a2 = creditsFetcher.data) == null ? void 0 : _a2.credits) {
      setCredits(creditsFetcher.data.credits);
    }
  }, [creditsFetcher.data]);
  const activeInstallments = useMemo(() => {
    const all = [];
    credits.forEach((credit) => {
      credit.installments.forEach((inst) => {
        if (!inst.paid) {
          const original = Number(inst.amount);
          const paidAmt = Number(inst.paid_amount || 0);
          all.push({
            ...inst,
            credit_id: credit.id,
            original_amount: original,
            paid_amount: paidAmt,
            amount: original - paidAmt
          });
        }
      });
      if (credit.installments.length === 0 && credit.balance > 0) {
        all.push({
          id: -credit.id,
          credit_id: credit.id,
          installment_number: 0,
          original_amount: Number(credit.total_amount),
          paid_amount: Number(credit.total_amount) - Number(credit.balance),
          amount: Number(credit.balance),
          due_date: "Flexible",
          status: "PENDIENTE",
          paid: false
        });
      }
    });
    return all;
  }, [credits]);
  const selectedCustomerShopify = useMemo(() => {
    return customers.find((c) => c.id === selectedCustomerId);
  }, [selectedCustomerId, customers]);
  const backendCustomerInfo = useMemo(() => {
    if (credits.length > 0 && credits[0].customer) {
      return credits[0].customer;
    }
    return null;
  }, [credits]);
  useEffect(() => {
    if (!paymentForm.autoSelect || activeInstallments.length === 0) return;
    const amount = Number(paymentForm.amount) || 0;
    let remaining = amount;
    const newSelected = {};
    const sorted = [...activeInstallments].sort((a, b) => {
      if (a.due_date === "Flexible") return 1;
      if (b.due_date === "Flexible") return -1;
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
    });
    for (const inst of sorted) {
      if (remaining >= inst.amount) {
        newSelected[inst.id] = true;
        remaining -= inst.amount;
      } else if (remaining > 0) {
        newSelected[inst.id] = true;
        remaining = 0;
      } else {
        newSelected[inst.id] = false;
      }
    }
    setSelectedInstallments(newSelected);
  }, [paymentForm.amount, paymentForm.autoSelect, activeInstallments]);
  const handleToggleInstallment = (id, checked) => {
    setSelectedInstallments((prev) => ({
      ...prev,
      [id]: checked
    }));
  };
  const selectedTotalDebt = useMemo(() => {
    return activeInstallments.reduce((sum, inst) => {
      if (selectedInstallments[inst.id]) {
        return sum + inst.amount;
      }
      return sum;
    }, 0);
  }, [activeInstallments, selectedInstallments]);
  const overdueInstallments = useMemo(() => {
    if (!paymentForm.date) return [];
    const pDate = new Date(paymentForm.date);
    pDate.setHours(0, 0, 0, 0);
    return activeInstallments.filter((inst) => {
      if (!selectedInstallments[inst.id] || !inst.due_date || inst.due_date === "Flexible") return false;
      const dDate = new Date(inst.due_date);
      dDate.setHours(0, 0, 0, 0);
      return pDate > dDate;
    });
  }, [paymentForm.date, selectedInstallments, activeInstallments]);
  const paymentAmount = Number(paymentForm.amount) || 0;
  const surplusAmount = Math.max(0, paymentAmount - selectedTotalDebt);
  const remainingDebt = Math.max(0, selectedTotalDebt - paymentAmount);
  const handleConfirmPayment = () => {
    if (isSubmitting) return;
    const selectedList = activeInstallments.filter((inst) => selectedInstallments[inst.id]);
    if (selectedList.length === 0) {
      alert("Por favor seleccione al menos una cuota o crédito.");
      return;
    }
    const isCashMethod = paymentForm.method === "Dolares en efectivo" || paymentForm.method === "Bolivares en efectivo";
    const isDigitalMethod = paymentForm.method === "Binance" || paymentForm.method === "Zelle" || paymentForm.method === "Zinli" || paymentForm.method === "Debito";
    if (!isCashMethod) {
      if (paymentForm.method === "Pago movil" || paymentForm.method === "Transferencia") {
        if (paymentForm.reference.length !== 13) {
          alert("El número de referencia debe tener exactamente 13 dígitos numéricos.");
          return;
        }
      } else if (isDigitalMethod) {
        if (!paymentForm.reference.trim()) {
          alert("Debe ingresar un número de referencia para este método de pago.");
          return;
        }
      }
    }
    let finalNotes = paymentForm.notes || "";
    if (paymentForm.autoSelect) {
      finalNotes = `[Auto-selección] ${finalNotes}`;
    }
    if (isVesMethod && !isNaN(effectiveTasa) && montoVes) {
      const sourceLabel = isManualTasa ? "ingresada manualmente" : `Fecha tasa: ${tasaFecha || "hoy"}`;
      const conversionNote = `[Conversión BCV] Tasa: ${effectiveTasa.toFixed(2)} Bs/USD | Equivalente: Bs. ${montoVes.toFixed(2)} (${sourceLabel})`;
      finalNotes = finalNotes ? `${finalNotes}
${conversionNote}` : conversionNote;
    }
    const hasFiado = selectedList.some((i) => i.installment_number === 0);
    const punctualityFeedback = hasFiado && paymentForm.fiadoFeedback !== "" ? Number(paymentForm.fiadoFeedback) : void 0;
    const itemsToPay = selectedList.map((inst) => ({
      id: inst.id,
      creditId: inst.credit_id,
      amount: inst.amount
    }));
    const data = {
      customerId: selectedCustomerId,
      installments: itemsToPay,
      useFavorableBalance,
      distributeExcess,
      notes: finalNotes.trim(),
      paymentDate: paymentForm.date,
      approvalStatus,
      amount: paymentAmount,
      method: paymentForm.method,
      reference: paymentForm.reference,
      punctualityFeedback
    };
    submit({
      paymentData: JSON.stringify(data)
    }, {
      method: "post"
    });
  };
  const handleReset = () => {
    setSelectedCustomerId("");
    setSearchCreditId("");
    setSearchDate("");
    setPaymentForm({
      date: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
      exchangeRate: "100",
      method: "Dolares en efectivo",
      amount: "0",
      reference: "",
      notes: "",
      autoSelect: false,
      fiadoFeedback: ""
    });
    setSelectedInstallments({});
    setUseFavorableBalance(false);
    setDistributeExcess(true);
    setApprovalStatus("APROBADO");
  };
  return /* @__PURE__ */ jsx("s-page", {
    heading: "Registrar Pago",
    children: /* @__PURE__ */ jsxs("s-stack", {
      gap: "base",
      children: [actionError && /* @__PURE__ */ jsx("s-banner", {
        tone: "critical",
        onDismiss: () => setActionError(null),
        children: actionError
      }), overdueInstallments.length > 0 && /* @__PURE__ */ jsx("s-banner", {
        tone: "warning",
        heading: "Pago fuera de fecha límite",
        children: /* @__PURE__ */ jsxs("s-text", {
          children: ["Está registrando un pago para ", overdueInstallments.length, ' cuota(s) después de su fecha de vencimiento. Esto marcará estas cuotas como "PAGADA ATRASADA" y afectará la reputación del cliente.']
        })
      }), /* @__PURE__ */ jsxs("s-grid", {
        gridTemplateColumns: "2.5fr 1fr",
        gap: "base",
        children: [/* @__PURE__ */ jsxs("s-stack", {
          gap: "base",
          children: [/* @__PURE__ */ jsxs("s-section", {
            padding: "base",
            children: [/* @__PURE__ */ jsx("s-heading", {
              children: "Criterios de Búsqueda"
            }), /* @__PURE__ */ jsxs("s-grid", {
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: "small",
              children: [/* @__PURE__ */ jsxs("s-select", {
                label: "Cliente",
                value: selectedCustomerId,
                onChange: (e) => {
                  var _a2;
                  return setSelectedCustomerId(((_a2 = e.target) == null ? void 0 : _a2.value) || "");
                },
                children: [/* @__PURE__ */ jsx("s-option", {
                  value: "",
                  children: "Seleccione un cliente"
                }), customers.map((c) => /* @__PURE__ */ jsx("s-option", {
                  value: c.id,
                  children: c.displayName
                }, c.id))]
              }), /* @__PURE__ */ jsx("s-number-field", {
                label: "ID Crédito",
                placeholder: "Ej: 123",
                value: searchCreditId,
                onChange: (e) => {
                  var _a2;
                  return setSearchCreditId(((_a2 = e.target) == null ? void 0 : _a2.value) || "");
                }
              }), /* @__PURE__ */ jsx("s-date-field", {
                label: "Fecha de Emisión",
                value: searchDate,
                onChange: (e) => {
                  var _a2;
                  return setSearchDate(((_a2 = e.target) == null ? void 0 : _a2.value) || "");
                }
              })]
            })]
          }), /* @__PURE__ */ jsxs("s-section", {
            padding: "base",
            children: [/* @__PURE__ */ jsx("s-heading", {
              children: "Registro del Pago"
            }), /* @__PURE__ */ jsxs("s-stack", {
              gap: "base",
              children: [/* @__PURE__ */ jsxs("s-grid", {
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: "small",
                children: [/* @__PURE__ */ jsx("s-date-field", {
                  label: "Fecha de pago",
                  value: paymentForm.date,
                  onChange: (e) => setPaymentForm((p) => {
                    var _a2;
                    return {
                      ...p,
                      date: ((_a2 = e.target) == null ? void 0 : _a2.value) || ""
                    };
                  })
                }), /* @__PURE__ */ jsxs("s-select", {
                  label: "Método de pago",
                  value: paymentForm.method,
                  onChange: (e) => setPaymentForm((p) => {
                    var _a2;
                    return {
                      ...p,
                      method: ((_a2 = e.target) == null ? void 0 : _a2.value) || ""
                    };
                  }),
                  children: [/* @__PURE__ */ jsx("s-option", {
                    value: "Dolares en efectivo",
                    children: "Dólares en efectivo"
                  }), /* @__PURE__ */ jsx("s-option", {
                    value: "Bolivares en efectivo",
                    children: "Bolívares en efectivo"
                  }), /* @__PURE__ */ jsx("s-option", {
                    value: "Pago movil",
                    children: "Pago móvil"
                  }), /* @__PURE__ */ jsx("s-option", {
                    value: "Transferencia",
                    children: "Transferencia"
                  }), /* @__PURE__ */ jsx("s-option", {
                    value: "Binance",
                    children: "Binance"
                  }), /* @__PURE__ */ jsx("s-option", {
                    value: "Zelle",
                    children: "Zelle"
                  }), /* @__PURE__ */ jsx("s-option", {
                    value: "Zinli",
                    children: "Zinli"
                  }), /* @__PURE__ */ jsx("s-option", {
                    value: "Debito",
                    children: "Débito"
                  })]
                }), /* @__PURE__ */ jsxs("s-stack", {
                  direction: "block",
                  gap: "none",
                  children: [/* @__PURE__ */ jsx("s-number-field", {
                    label: "Monto Pagado (USD)",
                    value: paymentForm.amount,
                    onChange: (e) => setPaymentForm((p) => {
                      var _a2;
                      return {
                        ...p,
                        amount: ((_a2 = e.target) == null ? void 0 : _a2.value) || ""
                      };
                    })
                  }), selectedTotalDebt > 0 && /* @__PURE__ */ jsx("div", {
                    style: {
                      marginTop: "4px"
                    },
                    children: /* @__PURE__ */ jsxs("s-button", {
                      variant: "tertiary",
                      accessibilityLabel: "Completar deuda",
                      onClick: () => {
                        setPaymentForm((p) => ({
                          ...p,
                          amount: String(selectedTotalDebt)
                        }));
                      },
                      children: ["LLenar Deuda Exacta ($", selectedTotalDebt.toFixed(2), ")"]
                    })
                  })]
                })]
              }), isVesMethod && /* @__PURE__ */ jsxs("s-banner", {
                tone: isManualTasa ? "warning" : "info",
                heading: isManualTasa ? "Tasa ingresada manualmente" : "Tasa BCV Oficial Obtenida",
                children: [/* @__PURE__ */ jsx("s-text", {
                  children: isManualTasa ? "No se pudo obtener la tasa oficial automáticamente. La tasa se ha dejado editable para que pueda ingresarla." : `La tasa BCV de hoy (${tasaFecha}) es de Bs. ${tasaBcv == null ? void 0 : tasaBcv.toFixed(2)}.`
                }), montoVes !== null && montoVes > 0 && /* @__PURE__ */ jsx("s-text", {
                  children: /* @__PURE__ */ jsxs("strong", {
                    children: ["Equivalente en Bolívares: Bs. ", montoVes.toFixed(2)]
                  })
                })]
              }), /* @__PURE__ */ jsxs("s-grid", {
                gridTemplateColumns: "1fr 1.5fr",
                gap: "small",
                children: [isVesMethod && /* @__PURE__ */ jsx("s-number-field", {
                  label: isManualTasa ? "Tasa BCV (Manual)" : "Tasa BCV (Oficial)",
                  value: paymentForm.exchangeRate,
                  onChange: (e) => setPaymentForm((p) => {
                    var _a2;
                    return {
                      ...p,
                      exchangeRate: ((_a2 = e.target) == null ? void 0 : _a2.value) || ""
                    };
                  })
                }), paymentForm.method !== "Dolares en efectivo" && paymentForm.method !== "Bolivares en efectivo" && /* @__PURE__ */ jsx("s-number-field", {
                  label: "Referencia",
                  placeholder: "Ej: 123456",
                  value: paymentForm.reference,
                  onChange: (e) => {
                    var _a2;
                    const val = ((_a2 = e.target) == null ? void 0 : _a2.value) || "";
                    const numericVal = val.replace(/\D/g, "");
                    setPaymentForm((p) => ({
                      ...p,
                      reference: numericVal
                    }));
                  }
                })]
              }), /* @__PURE__ */ jsx("s-text-area", {
                label: "Notas adicionales",
                value: paymentForm.notes,
                onChange: (e) => setPaymentForm((p) => {
                  var _a2;
                  return {
                    ...p,
                    notes: ((_a2 = e.target) == null ? void 0 : _a2.value) || ""
                  };
                }),
                rows: 3
              }), activeInstallments.some((i) => selectedInstallments[i.id] && i.installment_number === 0) && /* @__PURE__ */ jsxs("s-select", {
                label: "¿El cliente pagó a tiempo? (Fiado)",
                value: paymentForm.fiadoFeedback,
                onChange: (e) => setPaymentForm((p) => {
                  var _a2;
                  return {
                    ...p,
                    fiadoFeedback: ((_a2 = e.target) == null ? void 0 : _a2.value) || ""
                  };
                }),
                children: [/* @__PURE__ */ jsx("s-option", {
                  value: "",
                  children: "-- Sin evaluar --"
                }), /* @__PURE__ */ jsx("s-option", {
                  value: "100",
                  children: "✅ Sí, puntualmente"
                }), /* @__PURE__ */ jsx("s-option", {
                  value: "50",
                  children: "⚠️ No, se retrasó"
                }), /* @__PURE__ */ jsx("s-option", {
                  value: "0",
                  children: "❌ No pagó"
                })]
              }), /* @__PURE__ */ jsxs("s-select", {
                label: "Estado de revisión del pago",
                value: approvalStatus,
                onChange: (e) => {
                  var _a2;
                  return setApprovalStatus(((_a2 = e.target) == null ? void 0 : _a2.value) || "EN_REVISION");
                },
                children: [/* @__PURE__ */ jsx("s-option", {
                  value: "EN_REVISION",
                  children: "🕐 El pago está pendiente por revisar"
                }), /* @__PURE__ */ jsx("s-option", {
                  value: "APROBADO",
                  children: "✅ El pago fue revisado y aprobado"
                }), /* @__PURE__ */ jsx("s-option", {
                  value: "NO_PAGADO",
                  children: "❌ El cliente no realizó el pago (No Pagado)"
                })]
              })]
            })]
          })]
        }), /* @__PURE__ */ jsxs("s-stack", {
          gap: "base",
          children: [/* @__PURE__ */ jsxs("s-section", {
            padding: "base",
            children: [/* @__PURE__ */ jsx("s-heading", {
              children: "Detalles del Cliente"
            }), /* @__PURE__ */ jsx("s-divider", {}), selectedCustomerShopify ? /* @__PURE__ */ jsxs("s-stack", {
              gap: "small",
              padding: "base",
              children: [/* @__PURE__ */ jsx("s-text", {
                type: "strong",
                children: selectedCustomerShopify.displayName
              }), /* @__PURE__ */ jsx("s-text", {
                color: "subdued",
                children: selectedCustomerShopify.email || "Sin email"
              }), /* @__PURE__ */ jsx("s-text", {
                color: "subdued",
                children: selectedCustomerShopify.phone || "Sin teléfono"
              }), backendCustomerInfo && /* @__PURE__ */ jsx("s-box", {
                padding: "small",
                borderRadius: "base",
                children: /* @__PURE__ */ jsxs("s-stack", {
                  gap: "small",
                  padding: "large-100",
                  children: [/* @__PURE__ */ jsx("s-text", {
                    type: "strong",
                    children: "Saldo a Favor Disponible:"
                  }), /* @__PURE__ */ jsxs("s-text", {
                    tone: "info",
                    children: ["$", Number(backendCustomerInfo.favorable_balance).toFixed(2)]
                  }), Number(backendCustomerInfo.favorable_balance) > 0 && /* @__PURE__ */ jsx("s-checkbox", {
                    label: "Usar Saldo a Favor para este pago",
                    checked: useFavorableBalance || void 0,
                    onChange: (e) => {
                      var _a2;
                      return setUseFavorableBalance(!!((_a2 = e.target) == null ? void 0 : _a2.checked));
                    }
                  }), (() => {
                    const rep = backendCustomerInfo.reputation;
                    const repConfig = {
                      excelente: {
                        tone: "success",
                        label: "⭐ Excelente"
                      },
                      buena: {
                        tone: "info",
                        label: "👍 Buena"
                      },
                      regular: {
                        tone: "attention",
                        label: "⚠️ Regular"
                      },
                      mala: {
                        tone: "critical",
                        label: "❌ Mala"
                      }
                    };
                    const rc = rep && repConfig[rep];
                    if (!rc) return null;
                    return /* @__PURE__ */ jsxs("s-stack", {
                      direction: "inline",
                      gap: "small",
                      alignItems: "center",
                      children: [/* @__PURE__ */ jsx("s-text", {
                        type: "strong",
                        children: "Reputación:"
                      }), /* @__PURE__ */ jsx("s-badge", {
                        tone: rc.tone,
                        children: rc.label
                      })]
                    });
                  })()]
                })
              })]
            }) : /* @__PURE__ */ jsx("s-text", {
              color: "subdued",
              children: "Seleccione un cliente para ver detalles."
            })]
          }), /* @__PURE__ */ jsxs("s-section", {
            padding: "base",
            children: [/* @__PURE__ */ jsx("s-heading", {
              children: "Resumen de Operación"
            }), /* @__PURE__ */ jsx("s-divider", {}), /* @__PURE__ */ jsxs("s-stack", {
              gap: "small",
              padding: "base",
              children: [/* @__PURE__ */ jsxs("s-stack", {
                direction: "inline",
                justifyContent: "space-between",
                children: [/* @__PURE__ */ jsx("s-text", {
                  color: "subdued",
                  children: "Deuda seleccionada:"
                }), /* @__PURE__ */ jsxs("s-text", {
                  type: "strong",
                  children: ["$", selectedTotalDebt.toFixed(2)]
                })]
              }), /* @__PURE__ */ jsxs("s-stack", {
                direction: "inline",
                justifyContent: "space-between",
                children: [/* @__PURE__ */ jsx("s-text", {
                  color: "subdued",
                  children: "Monto pagado:"
                }), /* @__PURE__ */ jsxs("s-text", {
                  type: "strong",
                  children: ["$", paymentAmount.toFixed(2)]
                })]
              }), /* @__PURE__ */ jsx("s-divider", {}), surplusAmount > 0 && /* @__PURE__ */ jsxs("s-stack", {
                gap: "small",
                children: [/* @__PURE__ */ jsxs("s-stack", {
                  direction: "inline",
                  justifyContent: "space-between",
                  children: [/* @__PURE__ */ jsx("s-text", {
                    tone: "success",
                    type: "strong",
                    children: "Excedente al pagar:"
                  }), /* @__PURE__ */ jsxs("s-text", {
                    tone: "success",
                    type: "strong",
                    children: ["$", surplusAmount.toFixed(2)]
                  })]
                }), /* @__PURE__ */ jsx("s-checkbox", {
                  label: "Aplicar excedente a la siguiente cuota pendiente automáticamente",
                  checked: distributeExcess || void 0,
                  onChange: (e) => {
                    var _a2;
                    return setDistributeExcess(!!((_a2 = e.target) == null ? void 0 : _a2.checked));
                  }
                })]
              }), useFavorableBalance && backendCustomerInfo && Number(backendCustomerInfo.favorable_balance) > 0 && /* @__PURE__ */ jsxs("s-stack", {
                direction: "inline",
                justifyContent: "space-between",
                children: [/* @__PURE__ */ jsx("s-text", {
                  tone: "info",
                  type: "strong",
                  children: "Saldo a Favor aplicado:"
                }), /* @__PURE__ */ jsxs("s-text", {
                  tone: "info",
                  type: "strong",
                  children: ["-$", Math.min(Number(backendCustomerInfo.favorable_balance), selectedTotalDebt).toFixed(2)]
                })]
              }), /* @__PURE__ */ jsxs("s-stack", {
                direction: "inline",
                justifyContent: "space-between",
                children: [/* @__PURE__ */ jsx("s-text", {
                  type: "strong",
                  children: "Restante de deuda:"
                }), /* @__PURE__ */ jsxs("s-text", {
                  type: "strong",
                  children: ["$", remainingDebt.toFixed(2)]
                })]
              }), (() => {
                const selectedList = activeInstallments.filter((i) => selectedInstallments[i.id]);
                if (selectedList.length === 0) return null;
                const hasFiado = selectedList.some((i) => i.installment_number === 0);
                const credit = credits.find((c) => {
                  var _a2;
                  return c.id === ((_a2 = selectedList[0]) == null ? void 0 : _a2.credit_id);
                });
                const count = (credit == null ? void 0 : credit.installments_count) ?? 0;
                let periodicity = "Fiado";
                if (!hasFiado && count > 0) {
                  if (count % 24 === 0 || count % 26 === 0) periodicity = "Quincenal";
                  else periodicity = "Mensual";
                }
                return /* @__PURE__ */ jsxs("s-stack", {
                  direction: "inline",
                  justifyContent: "space-between",
                  children: [/* @__PURE__ */ jsx("s-text", {
                    color: "subdued",
                    children: "Periodicidad:"
                  }), /* @__PURE__ */ jsx("s-badge", {
                    tone: "info",
                    children: periodicity
                  })]
                });
              })(), /* @__PURE__ */ jsx("s-divider", {}), /* @__PURE__ */ jsxs("s-stack", {
                direction: "inline",
                justifyContent: "space-between",
                children: [/* @__PURE__ */ jsx("s-text", {
                  color: "subdued",
                  children: "Estado del pago:"
                }), /* @__PURE__ */ jsx("s-badge", {
                  tone: approvalStatus === "APROBADO" ? "success" : "warning",
                  children: approvalStatus === "APROBADO" ? "✅ Aprobado" : "🕐 En Revisión"
                })]
              })]
            })]
          })]
        })]
      }), /* @__PURE__ */ jsxs("s-section", {
        padding: "base",
        children: [/* @__PURE__ */ jsx("s-heading", {
          children: "Cuotas y Deudas Pendientes"
        }), /* @__PURE__ */ jsx("s-divider", {}), isLoadingCredits ? /* @__PURE__ */ jsx("s-stack", {
          padding: "base",
          alignItems: "center",
          children: /* @__PURE__ */ jsx("s-spinner", {})
        }) : activeInstallments.length === 0 ? /* @__PURE__ */ jsx("s-stack", {
          padding: "large",
          alignItems: "center",
          children: /* @__PURE__ */ jsx("s-text", {
            color: "subdued",
            children: "Este cliente no posee deudas pendientes."
          })
        }) : /* @__PURE__ */ jsxs("s-table", {
          variant: "auto",
          children: [/* @__PURE__ */ jsxs("s-table-header-row", {
            children: [/* @__PURE__ */ jsx("s-table-header", {
              listSlot: "primary",
              children: /* @__PURE__ */ jsx("s-checkbox", {
                checked: activeInstallments.length > 0 && activeInstallments.every((i) => selectedInstallments[i.id]),
                onChange: (e) => {
                  const checked = e.target.checked ?? e.currentTarget.checked;
                  const newSelected = {
                    ...selectedInstallments
                  };
                  activeInstallments.forEach((i) => {
                    newSelected[i.id] = checked;
                  });
                  setSelectedInstallments(newSelected);
                }
              })
            }), /* @__PURE__ */ jsx("s-table-header", {
              children: "ID Deuda"
            }), /* @__PURE__ */ jsx("s-table-header", {
              children: "Vencimiento"
            }), /* @__PURE__ */ jsx("s-table-header", {
              children: "Concepto"
            }), /* @__PURE__ */ jsx("s-table-header", {
              format: "numeric",
              children: "Monto Original"
            }), /* @__PURE__ */ jsx("s-table-header", {
              format: "numeric",
              children: "Abonado"
            }), /* @__PURE__ */ jsx("s-table-header", {
              format: "numeric",
              children: "Por Pagar"
            }), /* @__PURE__ */ jsx("s-table-header", {
              children: "Estado"
            })]
          }), /* @__PURE__ */ jsx("s-table-body", {
            children: activeInstallments.map((inst) => {
              var _a2;
              return /* @__PURE__ */ jsxs("s-table-row", {
                style: selectedInstallments[inst.id] ? {
                  backgroundColor: "var(--p-color-bg-surface-selected)"
                } : {},
                children: [/* @__PURE__ */ jsx("s-table-cell", {
                  children: /* @__PURE__ */ jsx("s-checkbox", {
                    checked: !!selectedInstallments[inst.id] || void 0,
                    onChange: (e) => handleToggleInstallment(inst.id, e.target.checked ?? e.currentTarget.checked)
                  })
                }), /* @__PURE__ */ jsxs("s-table-cell", {
                  children: ["#", inst.credit_id, inst.installment_number > 0 ? `-${inst.installment_number}` : ""]
                }), /* @__PURE__ */ jsx("s-table-cell", {
                  children: inst.due_date
                }), /* @__PURE__ */ jsx("s-table-cell", {
                  children: ((_a2 = credits.find((c) => c.id === inst.credit_id)) == null ? void 0 : _a2.concept) || "Crédito"
                }), /* @__PURE__ */ jsx("s-table-cell", {
                  children: /* @__PURE__ */ jsxs("s-text", {
                    color: "subdued",
                    children: ["$", (inst.original_amount ?? inst.amount).toFixed(2)]
                  })
                }), /* @__PURE__ */ jsx("s-table-cell", {
                  children: /* @__PURE__ */ jsxs("s-text", {
                    children: ["$", (inst.paid_amount ?? 0).toFixed(2)]
                  })
                }), /* @__PURE__ */ jsx("s-table-cell", {
                  children: /* @__PURE__ */ jsxs("s-text", {
                    type: "strong",
                    children: ["$", inst.amount.toFixed(2)]
                  })
                }), /* @__PURE__ */ jsx("s-table-cell", {
                  children: /* @__PURE__ */ jsx("s-badge", {
                    tone: "warning",
                    children: "Pendiente"
                  })
                })]
              }, inst.id);
            })
          })]
        })]
      }), /* @__PURE__ */ jsx("s-divider", {}), /* @__PURE__ */ jsxs("s-stack", {
        padding: "base",
        direction: "inline",
        justifyContent: "end",
        gap: "base",
        children: [/* @__PURE__ */ jsx("s-button", {
          onClick: handleReset,
          disabled: isSubmitting,
          accessibilityLabel: "Limpiar formulario de pago",
          children: "Limpiar Campos"
        }), /* @__PURE__ */ jsx("s-button", {
          tone: "critical",
          onClick: handleConfirmPayment,
          loading: isSubmitting || void 0,
          disabled: isSubmitting || activeInstallments.filter((i) => selectedInstallments[i.id]).length === 0,
          accessibilityLabel: "Confirmar y registrar pago seleccionado",
          children: "Confirmar Registro de Pago"
        })]
      })]
    })
  });
});
const route11 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$5,
  default: app_registre_payment,
  headers: headers$5,
  loader: loader$6
}, Symbol.toStringTag, { value: "Module" }));
function addDays(baseDateISO, days) {
  const [year, month, day] = baseDateISO.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  if (Number.isNaN(date.getTime())) return baseDateISO;
  date.setDate(date.getDate() + days);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
function addMonths(baseDateISO, months) {
  const [year, month, day] = baseDateISO.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  if (Number.isNaN(date.getTime())) return baseDateISO;
  const dayOfMonth = date.getDate();
  date.setMonth(date.getMonth() + months);
  if (date.getDate() < dayOfMonth) {
    date.setDate(0);
  }
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
function generateInstallmentSchedule(startDateISO, frequency, installmentNumber) {
  if (!startDateISO || installmentNumber <= 0) return [];
  const dates = [];
  for (let i = 1; i <= installmentNumber; i += 1) {
    dates.push(
      frequency === "quincenal" ? addDays(startDateISO, 15 * i) : addMonths(startDateISO, i)
    );
  }
  return dates;
}
const action$4 = async ({
  request
}) => {
  var _a2, _b, _c, _d, _e, _f, _g;
  const {
    session,
    admin
  } = await authenticate.admin(request);
  const formData = await request.formData();
  const payload = JSON.parse(formData.get("payload"));
  try {
    const accessToken = await getAccessTokenForShop(session.shop);
    if (!accessToken) {
      return {
        error: "No se pudo obtener el token de acceso desde el servidor."
      };
    }
    if (payload.isNewCustomer && payload.newCustomerData) {
      const data = payload.newCustomerData;
      const mutation = `
        mutation customerCreate($input: CustomerInput!) {
          customerCreate(input: $input) {
            customer {
              id
            }
            userErrors {
              field
              message
            }
          }
        }
      `;
      const variables = {
        input: {
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          phone: data.phone || null,
          metafields: [{
            namespace: "custom",
            key: "tipo_de_documento",
            type: "list.single_line_text_field",
            value: JSON.stringify([data.docType])
          }, {
            namespace: "custom",
            key: "numero_documento",
            type: "number_integer",
            value: String(data.docNum)
          }]
        }
      };
      try {
        const customerRes = await admin.graphql(mutation, {
          variables
        });
        const customerJson = await customerRes.json();
        const userErrors = (_b = (_a2 = customerJson.data) == null ? void 0 : _a2.customerCreate) == null ? void 0 : _b.userErrors;
        const graphqlErrors = customerJson.errors;
        if (graphqlErrors && graphqlErrors.length > 0) {
          console.error("[registre_credit] GraphQL errors:", graphqlErrors);
          return {
            error: `Error de GraphQL en Shopify: ${graphqlErrors.map((e) => e.message).join(", ")}`
          };
        }
        if (userErrors && userErrors.length > 0) {
          return {
            error: `Error de Shopify: ${userErrors.map((e) => e.message).join(", ")}`
          };
        }
        const gid = (_e = (_d = (_c = customerJson.data) == null ? void 0 : _c.customerCreate) == null ? void 0 : _d.customer) == null ? void 0 : _e.id;
        if (!gid) {
          console.error("[registre_credit] No GID in response:", customerJson);
          return {
            error: "Shopify no devolvió un ID para el nuevo cliente. Verifique los datos."
          };
        }
        const shopifyIdMatch = gid.match(/\/(\d+)$/);
        payload.customer_id = shopifyIdMatch ? parseInt(shopifyIdMatch[1], 10) : 0;
        payload.customer_name = `${data.firstName} ${data.lastName}`.trim();
        payload.customer_email = data.email;
      } catch (err) {
        console.error("[registre_credit] Error creating Shopify customer:", err);
        return {
          error: "Error de red al intentar crear el cliente en Shopify."
        };
      }
    }
    const BACKEND_URL2 = process.env.BACKEND_URL || "http://localhost:8000";
    const response = await fetch(`${BACKEND_URL2}/api/credits`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`
      },
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      const errorData = await response.json();
      let errorMsg = "Error al registrar el crédito";
      if (typeof errorData.detail === "string") {
        errorMsg = errorData.detail;
      } else if (Array.isArray(errorData.detail)) {
        errorMsg = errorData.detail.map((e) => e.msg).join(", ");
      }
      return {
        error: errorMsg
      };
    }
    try {
      if (payload.inventory_adjustments && payload.inventory_adjustments.length > 0) {
        const inventoryMutation = `
          mutation inventoryAdjustQuantities($input: InventoryAdjustQuantitiesInput!) {
            inventoryAdjustQuantities(input: $input) {
              userErrors {
                field
                message
              }
            }
          }
        `;
        const inventoryResponse = await admin.graphql(inventoryMutation, {
          variables: {
            input: {
              reason: "correction",
              name: "available",
              changes: payload.inventory_adjustments.map((adj) => ({
                delta: adj.delta,
                inventoryItemId: adj.inventoryItemId
              }))
            }
          }
        });
        const inventoryResult = await inventoryResponse.json();
        const userErrors = (_g = (_f = inventoryResult.data) == null ? void 0 : _f.inventoryAdjustQuantities) == null ? void 0 : _g.userErrors;
        if (userErrors && userErrors.length > 0) {
          console.error("[registre_credit] Error adjusting inventory:", userErrors);
        }
      }
    } catch (invError) {
      console.error("[registre_credit] Unexpected error during inventory sync:", invError);
    }
    return redirect("/app/expected_payments");
  } catch (error) {
    console.error("[registre_credit] Action error:", error);
    return {
      error: "Error de conexión con el servidor. Verifique que el backend esté ejecutándose."
    };
  }
};
const loader$5 = async ({
  request
}) => {
  var _a2, _b;
  const {
    admin,
    session
  } = await authenticate.admin(request);
  const url = new URL(request.url);
  if (url.searchParams.has("customerReputationId")) {
    const accessToken = await getAccessTokenForShop(session.shop);
    const searchId = url.searchParams.get("customerReputationId");
    if (!searchId) return {
      reputation: null
    };
    try {
      const BACKEND_URL2 = process.env.BACKEND_URL || "http://localhost:8000";
      const r = await fetch(`${BACKEND_URL2}/api/customers?shopify_customer_id=${searchId}&limit=1`, {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });
      if (r.ok) {
        const data2 = await r.json();
        const found = Array.isArray(data2) ? data2[0] : null;
        return {
          reputation: (found == null ? void 0 : found.reputation) ?? null
        };
      }
    } catch {
      return {
        reputation: null
      };
    }
    return {
      reputation: null
    };
  }
  const response = await admin.graphql(`
    {
      customers(first: 50) {
        nodes {
          id
          displayName
          email
          phone
        }
      }
      products(first: 50) {
        nodes {
          id
          title
          productType
          status
          totalInventory
          variants(first: 1) {
            nodes {
              id
              price
              inventoryItem {
                id
              }
              sku
            }
          }
        }
      }
    }
  `);
  const {
    data
  } = await response.json();
  const customers = ((_a2 = data == null ? void 0 : data.customers) == null ? void 0 : _a2.nodes) ?? [];
  const products = ((_b = data == null ? void 0 : data.products) == null ? void 0 : _b.nodes) ?? [];
  return {
    customers,
    products
  };
};
const headers$4 = () => ({
  "Cache-Control": "no-cache, no-store, must-revalidate"
});
const app_registre_credit = UNSAFE_withComponentProps(function RegistreCredit() {
  const {
    customers = [],
    products = []
  } = useLoaderData();
  const actionData = useActionData();
  const submit = useSubmit();
  const navigation = useNavigation();
  const errorBannerRef = useRef(null);
  const isSubmitting = navigation.state === "submitting" || navigation.state === "loading";
  const [clientError, setClientError] = useState(null);
  const [customerReputation, setCustomerReputation] = useState(null);
  const [mounted, setMounted] = useState(false);
  const [showBypassModal, setShowBypassModal] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  useEffect(() => {
    if (navigation.state === "submitting") {
      setClientError(null);
    }
  }, [navigation.state]);
  useEffect(() => {
    if ((actionData == null ? void 0 : actionData.error) && actionData.error.includes("REPUTATION_BLOCK")) {
      setShowBypassModal(true);
    }
  }, [actionData]);
  const initialForm = {
    customer: "",
    customer_id: "",
    total_credit_amount: "",
    payMethod: "",
    exchange_rate: "",
    datepay: "",
    first_payment_date: "",
    frequency: "fiado",
    installment_number: "1",
    installment_amount: ""
  };
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const [newCustomerForm, setNewCustomerForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    docType: "V",
    docNum: ""
  });
  const [form2, setForm] = useState(initialForm);
  useEffect(() => {
    const now = /* @__PURE__ */ new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    setForm((prev) => ({
      ...prev,
      first_payment_date: `${y}-${m}-${d}`
    }));
  }, []);
  const [selectedProducts, setSelectedProductsState] = useState({});
  const [quantities, setQuantities] = useState({});
  const selectedCustomer = useMemo(() => {
    if (!form2.customer) return void 0;
    return customers.find((c) => c.id === form2.customer);
  }, [form2.customer, customers]);
  const reputationFetcher = useFetcher();
  useEffect(() => {
    if (!form2.customer) {
      setCustomerReputation(null);
      return;
    }
    const numericId = form2.customer.split("/").pop();
    reputationFetcher.load(`/app/registre_credit?customerReputationId=${numericId}`);
  }, [form2.customer]);
  useEffect(() => {
    var _a2;
    if (reputationFetcher.data !== void 0) {
      setCustomerReputation(((_a2 = reputationFetcher.data) == null ? void 0 : _a2.reputation) || null);
    }
  }, [reputationFetcher.data]);
  const totalProductsAmount = useMemo(() => {
    return products.reduce((sum, p) => {
      var _a2;
      if (!selectedProducts[p.id]) return sum;
      const qty = quantities[p.id] ?? 0;
      const price = Number(((_a2 = p.variants.nodes[0]) == null ? void 0 : _a2.price) ?? 0);
      return sum + price * qty;
    }, 0);
  }, [products, selectedProducts, quantities]);
  const totalCreditNumber = totalProductsAmount;
  const installmentNumber = parseInt(form2.installment_number, 10) || 0;
  const installmentAmount = useMemo(() => {
    if (installmentNumber <= 0) return 0;
    return totalCreditNumber / installmentNumber;
  }, [totalCreditNumber, installmentNumber]);
  const schedule = useMemo(() => {
    if (!form2.first_payment_date || installmentNumber <= 0 || form2.frequency === "fiado") return [];
    return generateInstallmentSchedule(form2.first_payment_date, form2.frequency, installmentNumber);
  }, [form2.first_payment_date, form2.frequency, installmentNumber]);
  useEffect(() => {
    if (clientError || (actionData == null ? void 0 : actionData.error)) {
      setTimeout(() => {
        if (errorBannerRef.current) {
          errorBannerRef.current.scrollIntoView({
            behavior: "smooth",
            block: "start"
          });
        }
      }, 100);
    }
  }, [clientError, actionData == null ? void 0 : actionData.error]);
  useEffect(() => {
    if (clientError || (actionData == null ? void 0 : actionData.error)) {
      setClientError(null);
    }
  }, [form2, selectedProducts, quantities]);
  const handleToggleProduct = (productId, checked) => {
    setSelectedProductsState((prev) => ({
      ...prev,
      [productId]: checked
    }));
    if (!checked) {
      setQuantities((prev) => ({
        ...prev,
        [productId]: 0
      }));
    }
  };
  const handleQuantityChange = (productId, value) => {
    const numeric = Number(value || 0);
    setQuantities((prev) => ({
      ...prev,
      [productId]: Number.isNaN(numeric) ? 0 : numeric
    }));
  };
  const handleClear = () => {
    if (window.confirm("¿Está seguro de que desea limpiar todos los campos? Esta acción no se puede deshacer.")) {
      setForm(initialForm);
      setSelectedProductsState({});
      setQuantities({});
    }
  };
  const handleRegisterCredit = (isDraft = false, bypass = false) => {
    setClientError(null);
    if (isNewCustomer) {
      if (!newCustomerForm.firstName || !newCustomerForm.lastName || !newCustomerForm.email || !newCustomerForm.docNum) {
        setClientError("Por favor, complete todos los campos requeridos del nuevo cliente.");
        return;
      }
    } else {
      if (!form2.customer) {
        setClientError("Por favor, seleccione un cliente.");
        return;
      }
    }
    const selectedList = products.filter((p) => selectedProducts[p.id] && (quantities[p.id] || 0) > 0);
    if (selectedList.length === 0) {
      setClientError("Debe seleccionar al menos un producto con cantidad mayor a cero.");
      return;
    }
    let numericCustomerId = 0;
    let customerName = "";
    let customerEmail = "";
    let customerPhone = "";
    if (!isNewCustomer) {
      const shopifyIdMatch = form2.customer.match(/\/(\d+)$/);
      numericCustomerId = shopifyIdMatch ? parseInt(shopifyIdMatch[1], 10) : 0;
      const selected = customers.find((c) => String(c.id) === String(form2.customer) || c.id.endsWith(numericCustomerId.toString()));
      customerName = (selected == null ? void 0 : selected.displayName) || "";
      customerEmail = (selected == null ? void 0 : selected.email) || "";
      customerPhone = (selected == null ? void 0 : selected.phone) || "";
    }
    const concept = selectedList.map((p) => `${p.title} (x${quantities[p.id]})`).join(", ");
    const inventoryAdjustments = selectedList.map((p) => {
      var _a2;
      return {
        inventoryItemId: (_a2 = p.variants.nodes[0]) == null ? void 0 : _a2.inventoryItem.id,
        delta: -(quantities[p.id] || 0)
        // Extracción de inventario
      };
    }).filter((adj) => !!adj.inventoryItemId);
    console.log("[registre_credit] Registering credit for:", {
      isNewCustomer,
      gid: !isNewCustomer ? form2.customer : "NEW_CUSTOMER",
      numericId: numericCustomerId,
      foundName: customerName,
      foundEmail: customerEmail,
      foundPhone: customerPhone,
      newCustomerData: isNewCustomer ? newCustomerForm : null
    });
    const payload = {
      isNewCustomer,
      newCustomerData: isNewCustomer ? newCustomerForm : void 0,
      customer_id: numericCustomerId,
      customer_name: customerName,
      customer_email: customerEmail,
      customer_phone: customerPhone,
      concept,
      total_amount: totalProductsAmount,
      installments_count: form2.frequency === "fiado" ? 0 : parseInt(form2.installment_number, 10) || 1,
      first_due_date: form2.frequency === "fiado" ? null : form2.first_payment_date,
      frequency: form2.frequency,
      status: isDraft ? "PENDIENTE_ACTIVACION" : "EMITIDO",
      inventory_adjustments: inventoryAdjustments,
      bypass_reputation_block: bypass,
      items: selectedList.map((p) => {
        const variant = p.variants.nodes[0];
        const qty = quantities[p.id] || 0;
        const price = Number((variant == null ? void 0 : variant.price) ?? 0);
        return {
          product_id: p.id,
          product_code: (variant == null ? void 0 : variant.sku) || null,
          product_name: p.title,
          quantity: qty,
          unit_price: price
        };
      })
    };
    submit({
      payload: JSON.stringify(payload)
    }, {
      method: "post"
    });
  };
  const description = useMemo(() => {
    if (!selectedCustomer) {
      return "Seleccione un cliente para ver más detalles.";
    }
    return selectedCustomer.displayName + `
Teléfono: ${selectedCustomer.phone ?? "Sin teléfono"}
Email: ${selectedCustomer.email ?? "Sin email"}`;
  }, [selectedCustomer]);
  const descriptionLines = description.split("\n");
  return /* @__PURE__ */ jsxs("s-page", {
    heading: "Registrar Crédito",
    children: [/* @__PURE__ */ jsxs("s-stack", {
      gap: "base",
      children: [((actionData == null ? void 0 : actionData.error) || clientError) && /* @__PURE__ */ jsx("div", {
        ref: errorBannerRef,
        children: /* @__PURE__ */ jsx("s-banner", {
          tone: "critical",
          children: /* @__PURE__ */ jsx("s-text", {
            children: clientError || (actionData == null ? void 0 : actionData.error)
          })
        })
      }), /* @__PURE__ */ jsxs("s-grid", {
        gridTemplateColumns: "repeat(2, 2fr, 1fr)",
        gap: "small",
        justifyContent: "center",
        padding: "base",
        children: [/* @__PURE__ */ jsxs("s-section", {
          children: [/* @__PURE__ */ jsx("s-heading", {
            children: "Nombre de Cliente"
          }), /* @__PURE__ */ jsxs("s-grid", {
            gridTemplateColumns: "repeat(2, 3fr)",
            gap: "small",
            padding: "base",
            alignContent: "space-between",
            children: [/* @__PURE__ */ jsx("s-grid-item", {
              gridColumn: "span 1",
              children: /* @__PURE__ */ jsxs("s-stack", {
                direction: "block",
                gap: "base",
                children: [/* @__PURE__ */ jsxs("s-stack", {
                  direction: "inline",
                  alignItems: "center",
                  gap: "small",
                  children: [/* @__PURE__ */ jsx("input", {
                    type: "checkbox",
                    id: "isNewCustomerToggle",
                    checked: isNewCustomer,
                    onChange: (e) => setIsNewCustomer(e.target.checked),
                    style: {
                      cursor: "pointer"
                    }
                  }), /* @__PURE__ */ jsx("label", {
                    htmlFor: "isNewCustomerToggle",
                    style: {
                      cursor: "pointer",
                      fontWeight: "bold"
                    },
                    children: "Crear Nuevo Cliente"
                  })]
                }), !isNewCustomer ? customers.length === 0 ? /* @__PURE__ */ jsx("s-text", {
                  color: "subdued",
                  children: "No hay clientes registrados en esta tienda."
                }) : /* @__PURE__ */ jsxs("s-select", {
                  label: "Cliente",
                  details: "Seleccione nombre del cliente",
                  value: form2.customer,
                  onChange: (event) => {
                    const raw = event.currentTarget.value;
                    setForm((prev) => ({
                      ...prev,
                      customer: raw ?? "",
                      customer_id: raw ?? ""
                    }));
                  },
                  children: [/* @__PURE__ */ jsx("s-option", {
                    value: "",
                    children: "Seleccione un cliente"
                  }), customers.map((customer) => /* @__PURE__ */ jsx("s-option", {
                    value: customer.id,
                    children: customer.displayName
                  }, customer.id))]
                }) : /* @__PURE__ */ jsxs("s-stack", {
                  direction: "block",
                  gap: "small",
                  children: [/* @__PURE__ */ jsx("s-text-field", {
                    label: "Nombre",
                    value: newCustomerForm.firstName,
                    onInput: (e) => {
                      var _a2;
                      const val = ((_a2 = e.target) == null ? void 0 : _a2.value) || "";
                      setNewCustomerForm((prev) => ({
                        ...prev,
                        firstName: val
                      }));
                    },
                    required: true
                  }), /* @__PURE__ */ jsx("s-text-field", {
                    label: "Apellido",
                    value: newCustomerForm.lastName,
                    onInput: (e) => {
                      var _a2;
                      const val = ((_a2 = e.target) == null ? void 0 : _a2.value) || "";
                      setNewCustomerForm((prev) => ({
                        ...prev,
                        lastName: val
                      }));
                    },
                    required: true
                  }), /* @__PURE__ */ jsx("s-text-field", {
                    label: "Email",
                    value: newCustomerForm.email,
                    onInput: (e) => {
                      var _a2;
                      const val = ((_a2 = e.target) == null ? void 0 : _a2.value) || "";
                      setNewCustomerForm((prev) => ({
                        ...prev,
                        email: val
                      }));
                    },
                    required: true
                  }), /* @__PURE__ */ jsx("s-text-field", {
                    label: "Teléfono",
                    value: newCustomerForm.phone,
                    onInput: (e) => {
                      var _a2;
                      const val = ((_a2 = e.target) == null ? void 0 : _a2.value) || "";
                      setNewCustomerForm((prev) => ({
                        ...prev,
                        phone: val
                      }));
                    }
                  }), /* @__PURE__ */ jsxs("s-stack", {
                    direction: "inline",
                    gap: "small",
                    children: [/* @__PURE__ */ jsx("s-box", {
                      inlineSize: "100px",
                      children: /* @__PURE__ */ jsxs("s-select", {
                        label: "Tipo Doc.",
                        value: newCustomerForm.docType,
                        onChange: (e) => {
                          var _a2;
                          const val = ((_a2 = e.target) == null ? void 0 : _a2.value) || "V";
                          setNewCustomerForm((prev) => ({
                            ...prev,
                            docType: val
                          }));
                        },
                        children: [/* @__PURE__ */ jsx("s-option", {
                          value: "V",
                          children: "V"
                        }), /* @__PURE__ */ jsx("s-option", {
                          value: "J",
                          children: "J"
                        }), /* @__PURE__ */ jsx("s-option", {
                          value: "E",
                          children: "E"
                        })]
                      })
                    }), /* @__PURE__ */ jsx("s-box", {
                      inlineSize: "auto",
                      children: /* @__PURE__ */ jsx("s-number-field", {
                        label: "N° Documento",
                        inputMode: "numeric",
                        value: newCustomerForm.docNum,
                        onChange: (e) => {
                          var _a2;
                          const val = ((_a2 = e.target) == null ? void 0 : _a2.value) || "";
                          setNewCustomerForm((prev) => ({
                            ...prev,
                            docNum: val
                          }));
                        },
                        required: true
                      })
                    })]
                  })]
                })]
              })
            }), /* @__PURE__ */ jsx("s-grid-item", {
              gridColumn: "auto",
              children: /* @__PURE__ */ jsx("s-section", {
                accessibilityLabel: "Info de los clientes",
                children: /* @__PURE__ */ jsx("s-stack", {
                  direction: "inline",
                  justifyContent: "center",
                  padding: "base",
                  children: /* @__PURE__ */ jsxs("s-box", {
                    children: [isNewCustomer ? /* @__PURE__ */ jsxs("s-text", {
                      tone: "info",
                      children: ["Creando nuevo cliente: ", /* @__PURE__ */ jsx("br", {}), newCustomerForm.firstName, " ", newCustomerForm.lastName, " ", /* @__PURE__ */ jsx("br", {}), "Email: ", newCustomerForm.email, " ", /* @__PURE__ */ jsx("br", {}), "Documento: ", newCustomerForm.docType, "-", newCustomerForm.docNum]
                    }) : /* @__PURE__ */ jsx("s-text", {
                      tone: "info",
                      children: descriptionLines.join(" | ")
                    }), !isNewCustomer && customerReputation && (() => {
                      const repConfig = {
                        excelente: {
                          tone: "success",
                          label: "⭐ Excelente"
                        },
                        buena: {
                          tone: "info",
                          label: "👍 Buena"
                        },
                        regular: {
                          tone: "attention",
                          label: "⚠️ Regular"
                        },
                        mala: {
                          tone: "critical",
                          label: "❌ Mala"
                        }
                      };
                      const rc = repConfig[customerReputation];
                      if (!rc) return null;
                      const badgeTone = rc.tone || "info";
                      return /* @__PURE__ */ jsxs("s-stack", {
                        direction: "inline",
                        gap: "small",
                        alignItems: "center",
                        padding: "small",
                        children: [/* @__PURE__ */ jsx("s-text", {
                          type: "strong",
                          children: "Reputación crediticia:"
                        }), /* @__PURE__ */ jsx("s-badge", {
                          tone: badgeTone,
                          children: rc.label
                        })]
                      });
                    })()]
                  })
                })
              })
            })]
          }), /* @__PURE__ */ jsxs("s-grid", {
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "base",
            padding: "base",
            alignItems: "center",
            placeContent: "normal center",
            children: [/* @__PURE__ */ jsx("s-grid-item", {
              gridColumn: "auto",
              children: /* @__PURE__ */ jsx("s-section", {
                children: /* @__PURE__ */ jsxs("s-stack", {
                  gap: "small",
                  direction: "block",
                  alignItems: "center",
                  children: [/* @__PURE__ */ jsx("s-text", {
                    color: "subdued",
                    type: "strong",
                    children: "Monto total del Crédito (USD)"
                  }), /* @__PURE__ */ jsx("s-box", {
                    padding: "small",
                    borderStyle: "solid",
                    borderRadius: "base",
                    children: /* @__PURE__ */ jsxs("s-text", {
                      fontVariantNumeric: "tabular-nums",
                      children: ["$", totalProductsAmount.toFixed(2)]
                    })
                  })]
                })
              })
            }), /* @__PURE__ */ jsx("s-grid-item", {
              gridColumn: "auto",
              children: form2.frequency !== "fiado" && /* @__PURE__ */ jsx("s-section", {
                children: /* @__PURE__ */ jsx("s-stack", {
                  gap: "base",
                  direction: "inline",
                  justifyContent: "center",
                  children: /* @__PURE__ */ jsx("s-box", {
                    padding: "small",
                    borderStyle: "solid",
                    borderRadius: "base",
                    children: /* @__PURE__ */ jsx("s-number-field", {
                      label: "Numero de Cuotas",
                      placeholder: "1",
                      inputMode: "decimal",
                      value: form2.installment_number,
                      onChange: (event) => {
                        const raw = event.currentTarget.value;
                        setForm((prev) => ({
                          ...prev,
                          installment_number: raw ?? ""
                        }));
                      },
                      step: 1,
                      min: 1,
                      max: 1e5
                    })
                  })
                })
              })
            }), /* @__PURE__ */ jsx("s-grid-item", {
              gridColumn: "auto",
              children: form2.frequency !== "fiado" && /* @__PURE__ */ jsxs("s-section", {
                padding: "base",
                children: [/* @__PURE__ */ jsx("s-stack", {
                  gap: "small",
                  direction: "inline",
                  justifyContent: "center",
                  children: /* @__PURE__ */ jsxs("s-text", {
                    color: "subdued",
                    type: "strong",
                    children: ["Monto por Cuotas: $", installmentAmount.toFixed(2)]
                  })
                }), /* @__PURE__ */ jsx("s-stack", {
                  padding: "large-100",
                  gap: "small",
                  direction: "inline",
                  justifyContent: "center",
                  children: /* @__PURE__ */ jsxs("s-text", {
                    type: "strong",
                    color: "subdued",
                    children: ["Total: $", totalCreditNumber.toFixed(2), " | Cuotas:", " ", installmentNumber]
                  })
                })]
              })
            })]
          }), /* @__PURE__ */ jsxs("s-grid", {
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "small",
            padding: "base",
            alignItems: "center",
            children: [/* @__PURE__ */ jsx("s-grid-item", {
              gridColumn: "span 1",
              children: /* @__PURE__ */ jsx("s-section", {
                children: /* @__PURE__ */ jsx("s-stack", {
                  gap: "small",
                  direction: "inline",
                  justifyContent: "center",
                  children: /* @__PURE__ */ jsx("s-date-field", {
                    label: "Fecha de emisión del crédito",
                    details: "Permite calcular las fechas de pago",
                    value: form2.first_payment_date,
                    onChange: (event) => {
                      const raw = event.currentTarget.value;
                      setForm((prev) => ({
                        ...prev,
                        first_payment_date: raw ?? ""
                      }));
                    }
                  })
                })
              })
            }), /* @__PURE__ */ jsx("s-grid-item", {
              gridColumn: "span 1",
              children: /* @__PURE__ */ jsx("s-stack", {
                gap: "small",
                direction: "inline",
                justifyContent: "center",
                children: /* @__PURE__ */ jsxs("s-select", {
                  label: "Frecuencia de pago",
                  name: "payment period",
                  details: "Seleccione el tipo de crédito",
                  value: form2.frequency,
                  onChange: (event) => {
                    const raw = event.currentTarget.value;
                    if (raw === "quincenal" || raw === "mensual" || raw === "fiado") {
                      setForm((prev) => ({
                        ...prev,
                        frequency: raw
                      }));
                    }
                  },
                  children: [/* @__PURE__ */ jsx("s-option", {
                    value: "fiado",
                    children: "Fiado (Préstamo flexible)"
                  }), /* @__PURE__ */ jsx("s-option", {
                    value: "quincenal",
                    children: "Quincenal"
                  }), /* @__PURE__ */ jsx("s-option", {
                    value: "mensual",
                    children: "Mensual"
                  })]
                })
              })
            }), form2.frequency !== "fiado" && /* @__PURE__ */ jsx("s-grid-item", {
              gridColumn: "span 1",
              children: /* @__PURE__ */ jsxs("s-section", {
                children: [/* @__PURE__ */ jsx("s-stack", {
                  gap: "small",
                  direction: "inline",
                  justifyContent: "center",
                  children: /* @__PURE__ */ jsx("s-text", {
                    type: "strong",
                    color: "subdued",
                    children: "Próximas fechas de pago"
                  })
                }), /* @__PURE__ */ jsx("s-stack", {
                  gap: "small",
                  direction: "inline",
                  justifyContent: "center",
                  children: schedule.length === 0 ? /* @__PURE__ */ jsx("s-text", {
                    color: "subdued",
                    children: "Ingrese la fecha de emisión y el número de cuotas para ver el calendario."
                  }) : schedule.map((date, index2) => /* @__PURE__ */ jsxs("s-text", {
                    children: ["Cuota ", index2 + 1, ": ", date, index2 < schedule.length - 1 && /* @__PURE__ */ jsx("br", {})]
                  }, `${date}-${index2}`))
                })]
              })
            })]
          }), /* @__PURE__ */ jsx("s-grid", {
            gridTemplateColumns: "repeat(1, 3fr)",
            gap: "small",
            padding: "base",
            children: /* @__PURE__ */ jsx("s-text-area", {
              label: "Notas",
              value: "",
              rows: 3
            })
          })]
        }), /* @__PURE__ */ jsxs("s-section", {
          padding: "base",
          children: [/* @__PURE__ */ jsx("s-heading", {
            children: "Lista de Productos"
          }), products.length === 0 ? /* @__PURE__ */ jsx("s-text", {
            color: "subdued",
            children: "No hay productos disponibles en esta tienda."
          }) : /* @__PURE__ */ jsxs("s-table", {
            variant: "auto",
            children: [/* @__PURE__ */ jsxs("s-table-header-row", {
              children: [/* @__PURE__ */ jsx("s-table-header", {
                listSlot: "primary",
                children: "Seleccionar"
              }), /* @__PURE__ */ jsx("s-table-header", {
                children: "Producto"
              }), /* @__PURE__ */ jsx("s-table-header", {
                format: "numeric",
                children: "Precio"
              }), /* @__PURE__ */ jsx("s-table-header", {
                format: "numeric",
                children: "Cantidad"
              }), /* @__PURE__ */ jsx("s-table-header", {
                format: "numeric",
                children: "Disponible"
              }), /* @__PURE__ */ jsx("s-table-header", {
                children: "Estado"
              })]
            }), /* @__PURE__ */ jsx("s-table-body", {
              children: products.map((product) => {
                var _a2;
                const isSelected = selectedProducts[product.id] ?? false;
                const qty = quantities[product.id] ?? 0;
                const available = product.totalInventory ?? 0;
                const exceedsInventory = isSelected && qty > available;
                return /* @__PURE__ */ jsxs("s-table-row", {
                  children: [/* @__PURE__ */ jsx("s-table-cell", {
                    children: /* @__PURE__ */ jsx("s-checkbox", {
                      checked: isSelected || void 0,
                      onChange: (event) => {
                        const checked = event.currentTarget.checked;
                        handleToggleProduct(product.id, checked);
                      }
                    })
                  }), /* @__PURE__ */ jsx("s-table-cell", {
                    children: /* @__PURE__ */ jsx("s-text", {
                      type: "strong",
                      children: product.title
                    })
                  }), /* @__PURE__ */ jsx("s-table-cell", {
                    children: /* @__PURE__ */ jsxs("s-text", {
                      fontVariantNumeric: "tabular-nums",
                      children: ["$", Number(((_a2 = product.variants.nodes[0]) == null ? void 0 : _a2.price) ?? 0).toFixed(2)]
                    })
                  }), /* @__PURE__ */ jsx("s-table-cell", {
                    children: /* @__PURE__ */ jsx("s-number-field", {
                      name: `qty-${product.id}`,
                      label: `Cantidad para ${product.title}`,
                      labelAccessibilityVisibility: "exclusive",
                      min: 0,
                      step: 1,
                      value: String(qty || ""),
                      disabled: !isSelected || void 0,
                      onInput: (event) => handleQuantityChange(product.id, event.currentTarget.value)
                    })
                  }), /* @__PURE__ */ jsx("s-table-cell", {
                    children: /* @__PURE__ */ jsx("s-text", {
                      fontVariantNumeric: "tabular-nums",
                      children: available
                    })
                  }), /* @__PURE__ */ jsx("s-table-cell", {
                    children: !isSelected ? /* @__PURE__ */ jsx("s-badge", {
                      tone: "info",
                      children: "No seleccionado"
                    }) : exceedsInventory ? /* @__PURE__ */ jsx("s-badge", {
                      tone: "critical",
                      children: "⚠ Excede inventario"
                    }) : qty > 0 ? /* @__PURE__ */ jsx("s-badge", {
                      tone: "success",
                      children: "✓ Disponible"
                    }) : /* @__PURE__ */ jsx("s-badge", {
                      tone: "info",
                      children: "Seleccionado"
                    })
                  })]
                }, product.id);
              })
            })]
          })]
        }), /* @__PURE__ */ jsxs("s-section", {
          padding: "base",
          children: [/* @__PURE__ */ jsx("s-heading", {
            children: "Resumen del pedido"
          }), products.filter((p) => selectedProducts[p.id] && (quantities[p.id] ?? 0) > 0).length === 0 ? /* @__PURE__ */ jsx("s-paragraph", {
            color: "subdued",
            children: "No has seleccionado ningún producto todavía."
          }) : /* @__PURE__ */ jsxs(Fragment, {
            children: [/* @__PURE__ */ jsxs("s-table", {
              variant: "auto",
              children: [/* @__PURE__ */ jsxs("s-table-header-row", {
                children: [/* @__PURE__ */ jsx("s-table-header", {
                  listSlot: "primary",
                  children: "Producto"
                }), /* @__PURE__ */ jsx("s-table-header", {
                  listSlot: "primary",
                  children: "Fecha de Emisión"
                }), /* @__PURE__ */ jsx("s-table-header", {
                  format: "numeric",
                  children: "Precio Unit."
                }), /* @__PURE__ */ jsx("s-table-header", {
                  format: "numeric",
                  children: "Cantidad"
                }), /* @__PURE__ */ jsx("s-table-header", {
                  format: "numeric",
                  children: "Subtotal"
                }), /* @__PURE__ */ jsx("s-table-header", {
                  listSlot: "primary",
                  children: "Método de Pago"
                }), form2.frequency !== "fiado" && /* @__PURE__ */ jsx("s-table-header", {
                  listSlot: "primary",
                  children: "Cuotas"
                }), form2.frequency !== "fiado" && /* @__PURE__ */ jsx("s-table-header", {
                  listSlot: "primary",
                  children: "Próxima Cuota"
                })]
              }), /* @__PURE__ */ jsx("s-table-body", {
                children: products.filter((p) => selectedProducts[p.id] && (quantities[p.id] ?? 0) > 0).map((product) => {
                  var _a2;
                  const qty = quantities[product.id] ?? 0;
                  const price = Number(((_a2 = product.variants.nodes[0]) == null ? void 0 : _a2.price) ?? 0);
                  const subtotal = price * qty;
                  return /* @__PURE__ */ jsxs("s-table-row", {
                    children: [/* @__PURE__ */ jsx("s-table-cell", {
                      children: /* @__PURE__ */ jsx("s-text", {
                        type: "strong",
                        children: product.title
                      })
                    }), /* @__PURE__ */ jsx("s-table-cell", {
                      children: mounted ? (/* @__PURE__ */ new Date()).toLocaleDateString() : "—"
                    }), /* @__PURE__ */ jsx("s-table-cell", {
                      children: /* @__PURE__ */ jsxs("s-text", {
                        fontVariantNumeric: "tabular-nums",
                        children: ["$", price.toFixed(2)]
                      })
                    }), /* @__PURE__ */ jsx("s-table-cell", {
                      children: /* @__PURE__ */ jsx("s-text", {
                        fontVariantNumeric: "tabular-nums",
                        children: qty
                      })
                    }), /* @__PURE__ */ jsx("s-table-cell", {
                      children: /* @__PURE__ */ jsxs("s-text", {
                        fontVariantNumeric: "tabular-nums",
                        children: ["$", subtotal.toFixed(2)]
                      })
                    }), /* @__PURE__ */ jsx("s-table-cell", {
                      children: form2.payMethod || "—"
                    }), form2.frequency !== "fiado" && /* @__PURE__ */ jsx("s-table-cell", {
                      children: form2.installment_number || "—"
                    }), form2.frequency !== "fiado" && /* @__PURE__ */ jsx("s-table-cell", {
                      children: schedule[0] ?? "—"
                    })]
                  }, product.id);
                })
              })]
            }), /* @__PURE__ */ jsx("s-divider", {
              direction: "inline",
              color: "base"
            }), /* @__PURE__ */ jsx("s-stack", {
              justifyContent: "end",
              children: /* @__PURE__ */ jsxs("s-text", {
                type: "strong",
                fontVariantNumeric: "tabular-nums",
                children: ["Total aproximado: $", totalProductsAmount.toFixed(2)]
              })
            })]
          })]
        }), /* @__PURE__ */ jsx("s-divider", {}), /* @__PURE__ */ jsx("s-section", {
          padding: "base",
          children: /* @__PURE__ */ jsxs("s-stack", {
            direction: "block",
            alignItems: "end",
            gap: "small-100",
            children: [/* @__PURE__ */ jsxs("s-heading", {
              children: ["Monto Total del Crédito: $", totalProductsAmount.toFixed(2)]
            }), form2.frequency !== "fiado" && installmentNumber > 0 && /* @__PURE__ */ jsxs("s-heading", {
              children: ["Monto por Cuota (", installmentNumber, " cuotas): $", installmentAmount.toFixed(2)]
            })]
          })
        }), /* @__PURE__ */ jsx("s-stack", {
          padding: "base",
          direction: "inline",
          justifyContent: "end",
          children: /* @__PURE__ */ jsxs("s-button-group", {
            gap: "base",
            children: [/* @__PURE__ */ jsx("s-button", {
              slot: "primary-action",
              onClick: () => handleRegisterCredit(false),
              loading: isSubmitting || void 0,
              disabled: isSubmitting || void 0,
              accessibilityLabel: "Confirmar registro de crédito",
              children: "Registrar Crédito"
            }), /* @__PURE__ */ jsx("s-button", {
              slot: "secondary-actions",
              tone: "critical",
              onClick: handleClear,
              disabled: isSubmitting || void 0,
              accessibilityLabel: "Limpiar formulario de crédito",
              children: "Limpiar Campos"
            })]
          })
        })]
      }), /* @__PURE__ */ jsx("s-divider", {})]
    }), /* @__PURE__ */ jsxs("s-stack", {
      padding: "base",
      alignItems: "center",
      children: [/* @__PURE__ */ jsx("s-text", {
        color: "subdued",
        children: "Desarrollado por Opentech LCC"
      }), /* @__PURE__ */ jsxs("s-text", {
        children: ["¿Tienes alguna duda?", " ", /* @__PURE__ */ jsx("s-link", {
          href: "https://lccopen.tech/contact",
          target: "_blank",
          children: "Contáctanos"
        }), "."]
      })]
    }), showBypassModal && /* @__PURE__ */ jsx("s-modal", {
      open: showBypassModal,
      onClose: () => setShowBypassModal(false),
      title: "Confirmar Emisión de Crédito",
      children: /* @__PURE__ */ jsx("s-box", {
        padding: "base",
        children: /* @__PURE__ */ jsxs("s-stack", {
          gap: "base",
          direction: "block",
          children: [/* @__PURE__ */ jsx("s-text", {
            tone: "critical",
            type: "strong",
            children: "Advertencia de Reputación Crediticia"
          }), /* @__PURE__ */ jsx("s-paragraph", {
            children: "El cliente seleccionado tiene reputación clasificada como **Mala** y el bloqueo automático de créditos está activo."
          }), /* @__PURE__ */ jsx("s-paragraph", {
            children: "¿Desea omitir el bloqueo de reputación y registrar el crédito de todas formas?"
          }), /* @__PURE__ */ jsxs("s-stack", {
            direction: "inline",
            gap: "small",
            justifyContent: "end",
            children: [/* @__PURE__ */ jsx("s-button", {
              variant: "secondary",
              onClick: () => setShowBypassModal(false),
              children: "Cancelar"
            }), /* @__PURE__ */ jsx("s-button", {
              variant: "primary",
              tone: "critical",
              onClick: () => {
                setShowBypassModal(false);
                handleRegisterCredit(false, true);
              },
              children: "Confirmar y Registrar"
            })]
          })]
        })
      })
    })]
  });
});
const route12 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$4,
  default: app_registre_credit,
  headers: headers$4,
  loader: loader$5
}, Symbol.toStringTag, { value: "Module" }));
const loader$4 = async ({
  request
}) => {
  const {
    session
  } = await authenticate.admin(request);
  const accessToken = await getAccessTokenForShop(session.shop);
  if (!accessToken) return Response.json({
    error: "Token no disponible"
  }, {
    status: 401
  });
  const BACKEND_URL2 = process.env.BACKEND_URL || "http://localhost:8000";
  try {
    const res = await fetch(`${BACKEND_URL2}/api/audit/notifications`, {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });
    if (!res.ok) {
      return Response.json({
        error: "Error al obtener notificaciones"
      }, {
        status: res.status
      });
    }
    const data = await res.json();
    return Response.json(data);
  } catch (e) {
    return Response.json({
      error: "Error de conexión"
    }, {
      status: 500
    });
  }
};
const action$3 = async ({
  request
}) => {
  const {
    session
  } = await authenticate.admin(request);
  const accessToken = await getAccessTokenForShop(session.shop);
  if (!accessToken) return Response.json({
    error: "Token no disponible"
  }, {
    status: 401
  });
  const BACKEND_URL2 = process.env.BACKEND_URL || "http://localhost:8000";
  const formData = await request.formData();
  const intent = formData.get("intent");
  if (intent === "read_all") {
    try {
      const res = await fetch(`${BACKEND_URL2}/api/audit/notifications/read-all`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });
      if (!res.ok) return Response.json({
        error: "Error"
      }, {
        status: res.status
      });
      return Response.json({
        success: true
      });
    } catch (e) {
      return Response.json({
        error: "Error de conexión"
      }, {
        status: 500
      });
    }
  }
  if (intent === "read") {
    const id = formData.get("id");
    try {
      const res = await fetch(`${BACKEND_URL2}/api/audit/notifications/${id}/read`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });
      if (!res.ok) return Response.json({
        error: "Error"
      }, {
        status: res.status
      });
      return Response.json({
        success: true
      });
    } catch (e) {
      return Response.json({
        error: "Error de conexión"
      }, {
        status: 500
      });
    }
  }
  return Response.json({
    error: "Intent inválido"
  }, {
    status: 400
  });
};
const route13 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$3,
  loader: loader$4
}, Symbol.toStringTag, { value: "Module" }));
const loader$3 = async ({
  request
}) => {
  var _a2, _b;
  let session;
  let admin;
  try {
    ({
      session,
      admin
    } = await authenticate.admin(request));
  } catch (error) {
    throw error;
  }
  const accessToken = await getAccessTokenForShop(session.shop);
  if (!accessToken) throw new Error("Token no disponible");
  const url = new URL(request.url);
  const page = url.searchParams.get("page") || "1";
  const limit = url.searchParams.get("limit") || "10";
  const pageSize = parseInt(limit, 10) || 10;
  const offset = (Number(page) - 1) * pageSize;
  const payment_id = url.searchParams.get("payment_id") || "";
  const credit_id = url.searchParams.get("credit_id") || "";
  const customer_name = url.searchParams.get("customer_name") || "";
  const document_type = url.searchParams.get("document_type") || "";
  const document_id = url.searchParams.get("document_id") || "";
  const payment_date = url.searchParams.get("payment_date") || "";
  const status = url.searchParams.get("status") || "";
  const params = new URLSearchParams({
    limit: pageSize.toString(),
    offset: offset.toString()
  });
  if (payment_id) params.append("payment_id", payment_id);
  if (credit_id) params.append("credit_id", credit_id);
  if (customer_name) params.append("customer_name", customer_name);
  if (payment_date) params.append("payment_date", payment_date);
  if (status) params.append("status", status);
  if (document_type || document_id) {
    try {
      const gqlRes = await admin.graphql(`
        {
          customers(first: 250) {
            nodes {
              id
              metafields(first: 20) {
                nodes {
                  key
                  value
                }
              }
            }
          }
        }
      `);
      const {
        data
      } = await gqlRes.json();
      const shopifyCustomers = ((_a2 = data == null ? void 0 : data.customers) == null ? void 0 : _a2.nodes) ?? [];
      let matchId = "-1";
      for (const c of shopifyCustomers) {
        const mfs = ((_b = c.metafields) == null ? void 0 : _b.nodes) || [];
        let typeMatch = !document_type;
        let numMatch = !document_id;
        for (const mf of mfs) {
          const val = mf.value || "";
          const key = mf.key.toLowerCase();
          if (document_type && !typeMatch) {
            if ((key.includes("tipo") || key.includes("doc")) && val.includes(document_type)) {
              typeMatch = true;
            }
          }
          if (document_id && !numMatch) {
            if ((key === "n" || key.includes("num") || key.includes("n_") || key.includes("doc")) && val.includes(document_id)) {
              numMatch = true;
            }
          }
        }
        if (typeMatch && numMatch) {
          matchId = c.id.split("/").pop() || "-1";
          break;
        }
      }
      params.append("customer_id", matchId);
    } catch (e) {
      console.error("Error fetching customers for payment filter", e);
      params.append("customer_id", "-1");
    }
  }
  const SPREADSHEET_CSV_URL2 = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQqrzXGB4grT2FhonRlj3jZVC3E9sSaZl9gkgd0nSrwtA55E_Fcy7Q3QDCO8lTMlDS_D21wgDGaXJ1x/pub?output=csv";
  let tasaBcv = null;
  let tasaFecha = null;
  try {
    const csvRes = await fetch(SPREADSHEET_CSV_URL2);
    if (csvRes.ok) {
      const text2 = await csvRes.text();
      const lines = text2.trim().split("\n").filter((l) => l.trim());
      const lastLine = lines[lines.length - 1];
      const match = lastLine.match(/"([\d.,]+)\s*Bs\."/);
      if (match) {
        tasaBcv = parseFloat(match[1].replace(".", "").replace(",", "."));
      }
      const dateMatch = lastLine.match(/(\d{1,2}\/\d{2}\/\d{4})/);
      if (dateMatch) {
        tasaFecha = dateMatch[1];
      }
    }
  } catch (e) {
    console.error("[payments] Failed to fetch BCV rate:", e);
  }
  const BACKEND_URL2 = process.env.BACKEND_URL || "http://localhost:8000";
  const [paymentsRes, proofsRes] = await Promise.all([fetch(`${BACKEND_URL2}/api/payments?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  }), fetch(`${BACKEND_URL2}/api/payments/payment-proofs?status=PENDIENTE`, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  })]);
  const payments = await paymentsRes.json();
  const proofs = await proofsRes.json();
  return {
    payments,
    proofs: Array.isArray(proofs) ? proofs.filter((p) => p.status === "PENDIENTE") : [],
    page: Number(page),
    filters: {
      payment_id,
      credit_id,
      customer_name,
      document_type,
      document_id,
      payment_date,
      status,
      limit
    },
    tasaBcv,
    tasaFecha
  };
};
const action$2 = async ({
  request
}) => {
  const {
    session
  } = await authenticate.admin(request);
  const accessToken = await getAccessTokenForShop(session.shop);
  const formData = await request.formData();
  const intent = formData.get("intent");
  const authHeaders = {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json"
  };
  const BACKEND_URL2 = process.env.BACKEND_URL || "http://localhost:8000";
  try {
    if (intent === "batch-review") {
      const payment_ids = JSON.parse(formData.get("payment_ids"));
      const status = formData.get("status");
      await fetch(`${BACKEND_URL2}/api/payments/batch-review`, {
        method: "PATCH",
        headers: authHeaders,
        body: JSON.stringify({
          payment_ids,
          status
        })
      });
    } else if (intent === "batch-delete") {
      const payment_ids = JSON.parse(formData.get("payment_ids"));
      await fetch(`${BACKEND_URL2}/api/payments/batch-delete`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          payment_ids
        })
      });
    } else if (intent === "batch-cancel") {
      const payment_ids = JSON.parse(formData.get("payment_ids"));
      await fetch(`${BACKEND_URL2}/api/payments/batch-review`, {
        method: "PATCH",
        headers: authHeaders,
        body: JSON.stringify({
          payment_ids,
          status: "CANCELADO"
        })
      });
    } else if (intent === "revert") {
      const id = formData.get("id");
      await fetch(`${BACKEND_URL2}/api/payments/${id}/review`, {
        method: "PATCH",
        headers: authHeaders,
        body: JSON.stringify({
          status: "EN_REVISION"
        })
      });
    } else if (intent === "approve-proof" || intent === "reject-proof") {
      const payment_id = Number(formData.get("payment_id"));
      const proof_id = formData.get("proof_id");
      const status = intent === "approve-proof" ? "APROBADO" : "RECHAZADO";
      const res = await fetch(`${BACKEND_URL2}/api/payments/batch-review`, {
        method: "PATCH",
        headers: authHeaders,
        body: JSON.stringify({
          payment_ids: [payment_id],
          status
        })
      });
      if (res.ok) {
        await fetch(`${BACKEND_URL2}/api/payments/payment-proofs/${proof_id}/mark-reviewed`, {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        });
      }
    } else if (intent === "clear-proofs") {
      await fetch(`${BACKEND_URL2}/api/payments/payment-proofs`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });
    }
    return {
      success: true
    };
  } catch (e) {
    return {
      error: "Error en la transacción"
    };
  }
};
const headers$3 = () => ({
  "Cache-Control": "no-cache, no-store, must-revalidate"
});
const app_payments = UNSAFE_withComponentProps(function PaymentHistorial() {
  const {
    payments,
    proofs,
    page: loaderPage,
    filters,
    tasaBcv,
    tasaFecha
  } = useLoaderData();
  const submit = useSubmit();
  const navigation = useNavigation();
  const loading = navigation.state === "loading" || navigation.state === "submitting";
  const [page, setPage] = useState(loaderPage || 1);
  const [selectedIds, setSelectedIds] = useState(/* @__PURE__ */ new Set());
  const [filterState, setFilterState] = useState(filters);
  const pageSize = Number(filterState.limit || "10");
  useEffect(() => {
    setSelectedIds(/* @__PURE__ */ new Set());
  }, [payments]);
  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedIds(new Set(payments.map((p) => p.id)));
    } else {
      setSelectedIds(/* @__PURE__ */ new Set());
    }
  };
  const handleSearch = () => {
    const fd = new FormData();
    Object.entries(filterState).forEach(([k, v]) => {
      if (v) fd.append(k, v);
    });
    fd.append("page", "1");
    submit(fd, {
      method: "get"
    });
  };
  const clearSearch = () => {
    setFilterState({
      payment_id: "",
      credit_id: "",
      customer_name: "",
      document_type: "",
      document_id: "",
      payment_date: "",
      status: ""
    });
    submit({
      page: "1"
    }, {
      method: "get"
    });
  };
  const handleBatchReview = (status) => {
    if (selectedIds.size === 0) return;
    submit({
      intent: "batch-review",
      payment_ids: JSON.stringify(Array.from(selectedIds)),
      status
    }, {
      method: "post"
    });
  };
  const handleBatchDelete = () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`¿Está seguro de eliminar ${selectedIds.size} pagos?`)) return;
    submit({
      intent: "batch-delete",
      payment_ids: JSON.stringify(Array.from(selectedIds))
    }, {
      method: "post"
    });
  };
  const handleBatchCancel = () => {
    if (selectedIds.size === 0) return;
    if (!confirm("¿Seguro que deseas cancelar los pagos seleccionados? Se revertirá en resuelto en el crédito asociado.")) return;
    submit({
      intent: "batch-cancel",
      payment_ids: JSON.stringify(Array.from(selectedIds))
    }, {
      method: "post"
    });
  };
  const handleRevertPayment = (id) => {
    if (!confirm("¿Seguro que deseas revertir este pago a EN_REVISION?")) return;
    submit({
      intent: "revert",
      id: id.toString()
    }, {
      method: "post"
    });
  };
  const handleApproveProof = (proof) => {
    if (!confirm(`¿Aprobar el pago de $${proof.amount} reportado por ${proof.customer_name}?`)) return;
    submit({
      intent: "approve-proof",
      payment_id: proof.payment_id.toString(),
      proof_id: proof.id.toString()
    }, {
      method: "post"
    });
  };
  const handleRejectProof = (proof) => {
    if (!confirm(`¿Rechazar el pago de $${proof.amount} reportado por ${proof.customer_name}?`)) return;
    submit({
      intent: "reject-proof",
      payment_id: proof.payment_id.toString(),
      proof_id: proof.id.toString()
    }, {
      method: "post"
    });
  };
  const handleClearProofs = () => {
    if (!confirm("¿Está seguro de vaciar todos los comprobantes pendientes? Esta acción no se puede deshacer.")) return;
    submit({
      intent: "clear-proofs"
    }, {
      method: "post"
    });
  };
  const getStatusTone = (status) => {
    switch (status) {
      case "APROBADO":
        return "success";
      case "RECHAZADO":
        return "critical";
      case "EN_REVISION":
        return "warning";
      case "REGISTRADO":
        return "info";
      case "CANCELADO":
        return "critical";
      default:
        return "neutral";
    }
  };
  const hasApprovedSelected = Array.from(selectedIds).some((id) => {
    var _a2;
    return ((_a2 = payments.find((p) => p.id === id)) == null ? void 0 : _a2.status) === "APROBADO";
  });
  const handleExport = (format) => {
    if (!format || !payments.length) return;
    const exportData = payments.map((p) => {
      const creditTotal = Number(p.credit_total_amount);
      const abono = Number(p.amount);
      const diff = creditTotal - abono;
      const saldoRestante = Math.max(0, diff);
      const saldoAFavor = Math.max(0, abono - creditTotal);
      let cuotasCubiertas = "-";
      if (p.installments_covered) {
        cuotasCubiertas = p.installments_covered.split(",").filter((x) => x.trim()).length.toString();
      }
      return {
        "ID Pago": p.id,
        "ID Crédito": p.credit_id,
        Fecha: new Date(p.payment_date).toLocaleDateString("es-ES"),
        Cliente: p.customer_name,
        "Total Crédito": `$${creditTotal.toFixed(2)}`,
        "Cuotas Pagadas": cuotasCubiertas,
        Abono: `$${abono.toFixed(2)}`,
        "Balance Cliente": `$${saldoAFavor.toFixed(2)}`,
        "Balance Restante": `$${saldoRestante.toFixed(2)}`,
        Referencia: p.reference_number,
        Estado: p.status
      };
    });
    if (format === "csv" || format === "xlsx") {
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Pagos");
      if (format === "csv") {
        XLSX.writeFile(wb, "pagos.csv");
      } else {
        XLSX.writeFile(wb, "pagos.xlsx");
      }
    } else if (format === "pdf") {
      const doc = new jsPDF("landscape");
      doc.text("Reporte de Pagos", 14, 15);
      autoTable(doc, {
        startY: 20,
        head: [["ID Pago", "ID Crédito", "Fecha", "Cliente", "Total Crédito", "Abono", "Balance Restante", "Estado"]],
        body: exportData.map((d) => [d["ID Pago"], d["ID Crédito"], d["Fecha"], d.Cliente, d["Total Crédito"], d.Abono, d["Balance Restante"], d.Estado])
      });
      doc.save("pagos.pdf");
    }
  };
  return /* @__PURE__ */ jsxs("s-page", {
    heading: "Historial de Pagos",
    inlineSize: "large",
    children: [/* @__PURE__ */ jsx("s-button", {
      slot: "primary-action",
      icon: "plus",
      href: "/app/registre_payment",
      accessibilityLabel: "Ir a registrar pago",
      children: "Registrar Pago"
    }), tasaBcv && /* @__PURE__ */ jsx("s-banner", {
      tone: "info",
      heading: "Tasa de Cambio Oficial (BCV)",
      children: /* @__PURE__ */ jsxs("s-text", {
        children: ["La tasa de cambio actual es de ", /* @__PURE__ */ jsxs("strong", {
          children: ["Bs. ", tasaBcv.toFixed(2)]
        }), " por USD.", tasaFecha && ` Actualizada el: ${tasaFecha}.`]
      })
    }), proofs.length > 0 && /* @__PURE__ */ jsxs("s-section", {
      padding: "base",
      children: [/* @__PURE__ */ jsxs("s-stack", {
        direction: "inline",
        gap: "base",
        justifyContent: "space-between",
        alignItems: "center",
        children: [/* @__PURE__ */ jsxs("s-heading", {
          children: ["Comprobantes por Revisar (", proofs.length, ")"]
        }), /* @__PURE__ */ jsx("s-button", {
          icon: "delete",
          tone: "critical",
          variant: "secondary",
          onClick: handleClearProofs,
          accessibilityLabel: "Vaciar todos los comprobantes",
          children: "Vaciar Todo"
        })]
      }), /* @__PURE__ */ jsx("s-text", {
        color: "subdued",
        children: "Reportados por clientes vía página externa."
      }), /* @__PURE__ */ jsxs("s-table", {
        variant: "auto",
        children: [/* @__PURE__ */ jsxs("s-table-header-row", {
          children: [/* @__PURE__ */ jsx("s-table-header", {
            listSlot: "primary",
            children: "Fecha Envío"
          }), /* @__PURE__ */ jsx("s-table-header", {
            listSlot: "primary",
            children: "Cliente"
          }), /* @__PURE__ */ jsx("s-table-header", {
            listSlot: "primary",
            children: "Banco Origen"
          }), /* @__PURE__ */ jsx("s-table-header", {
            listSlot: "primary",
            children: "Referencia"
          }), /* @__PURE__ */ jsx("s-table-header", {
            listSlot: "primary",
            format: "numeric",
            children: "Monto"
          }), /* @__PURE__ */ jsx("s-table-header", {
            listSlot: "primary",
            children: "Acciones"
          })]
        }), /* @__PURE__ */ jsx("s-table-body", {
          children: proofs.map((p) => /* @__PURE__ */ jsxs("s-table-row", {
            children: [/* @__PURE__ */ jsx("s-table-cell", {
              children: /* @__PURE__ */ jsx(ClientDate, {
                dateString: p.submitted_at,
                format: "datetime"
              })
            }), /* @__PURE__ */ jsx("s-table-cell", {
              children: /* @__PURE__ */ jsxs("s-stack", {
                gap: "small",
                children: [/* @__PURE__ */ jsx("s-text", {
                  type: "strong",
                  children: p.customer_name
                }), /* @__PURE__ */ jsx("s-text", {
                  color: "subdued",
                  children: p.customer_email
                })]
              })
            }), /* @__PURE__ */ jsx("s-table-cell", {
              children: p.bank_name
            }), /* @__PURE__ */ jsx("s-table-cell", {
              children: p.reference_number
            }), /* @__PURE__ */ jsxs("s-table-cell", {
              children: ["$", p.amount.toFixed(2)]
            }), /* @__PURE__ */ jsx("s-table-cell", {
              children: /* @__PURE__ */ jsxs("s-button-group", {
                children: [/* @__PURE__ */ jsx("s-button", {
                  icon: "check",
                  tone: "auto",
                  onClick: () => handleApproveProof(p),
                  accessibilityLabel: "Aprobar comprobante de pago",
                  children: "Aprobar"
                }), /* @__PURE__ */ jsx("s-button", {
                  icon: "delete",
                  tone: "critical",
                  variant: "secondary",
                  onClick: () => handleRejectProof(p),
                  accessibilityLabel: "Rechazar comprobante de pago",
                  children: "Rechazar"
                }), /* @__PURE__ */ jsx("s-button", {
                  icon: "view",
                  variant: "secondary",
                  href: `/app/payment_detail/${p.payment_id}`,
                  accessibilityLabel: "Ver detalles del pago",
                  children: "Ver Pago"
                }), /* @__PURE__ */ jsx("s-button", {
                  icon: "view",
                  variant: "secondary",
                  href: `/app/credit_detail/${p.credit_id}`,
                  accessibilityLabel: "Ver detalles del crédito",
                  children: "Ver Crédito"
                })]
              })
            })]
          }, p.id))
        })]
      })]
    }), /* @__PURE__ */ jsx("s-divider", {}), /* @__PURE__ */ jsxs("s-section", {
      padding: "base",
      children: [/* @__PURE__ */ jsx("s-heading", {
        children: "Lista de Pagos"
      }), /* @__PURE__ */ jsxs("s-stack", {
        direction: "block",
        gap: "small",
        paddingBlockEnd: "base",
        children: [/* @__PURE__ */ jsx("s-stack", {
          direction: "inline",
          gap: "small",
          alignItems: "end",
          justifyContent: "space-between",
          children: /* @__PURE__ */ jsxs("s-stack", {
            direction: "inline",
            gap: "small",
            children: [/* @__PURE__ */ jsx("s-box", {
              inlineSize: "220px",
              children: /* @__PURE__ */ jsx("s-search-field", {
                label: "Cliente",
                placeholder: "Buscar por cliente...",
                value: filterState.customer_name,
                onInput: (e) => setFilterState({
                  ...filterState,
                  customer_name: e.currentTarget.value
                })
              })
            }), /* @__PURE__ */ jsx("s-box", {
              inlineSize: "120px",
              children: /* @__PURE__ */ jsxs("s-select", {
                label: "Tipo Doc.",
                value: filterState.document_type,
                onChange: (e) => {
                  var _a2;
                  return setFilterState({
                    ...filterState,
                    document_type: ((_a2 = e.target) == null ? void 0 : _a2.value) || ""
                  });
                },
                children: [/* @__PURE__ */ jsx("s-option", {
                  value: "",
                  children: "Todos"
                }), /* @__PURE__ */ jsx("s-option", {
                  value: "V",
                  children: "V"
                }), /* @__PURE__ */ jsx("s-option", {
                  value: "J",
                  children: "J"
                }), /* @__PURE__ */ jsx("s-option", {
                  value: "E",
                  children: "E"
                })]
              })
            }), /* @__PURE__ */ jsx("s-box", {
              inlineSize: "160px",
              children: /* @__PURE__ */ jsx("s-number-field", {
                label: "N° Documento",
                name: "document_id",
                min: 0,
                step: 1,
                inputMode: "numeric",
                value: filterState.document_id,
                onChange: (e) => {
                  var _a2;
                  return setFilterState({
                    ...filterState,
                    document_id: ((_a2 = e.target) == null ? void 0 : _a2.value) || ""
                  });
                }
              })
            }), /* @__PURE__ */ jsx("s-box", {
              inlineSize: "130px",
              children: /* @__PURE__ */ jsx("s-number-field", {
                label: "ID Pago",
                name: "payment_id",
                min: 0,
                step: 1,
                inputMode: "numeric",
                value: filterState.payment_id,
                onChange: (e) => {
                  var _a2;
                  return setFilterState({
                    ...filterState,
                    payment_id: ((_a2 = e.target) == null ? void 0 : _a2.value) || ""
                  });
                }
              })
            }), /* @__PURE__ */ jsx("s-box", {
              inlineSize: "130px",
              children: /* @__PURE__ */ jsx("s-number-field", {
                label: "ID Crédito",
                name: "credit_id",
                min: 0,
                step: 1,
                inputMode: "numeric",
                value: filterState.credit_id,
                onChange: (e) => {
                  var _a2;
                  return setFilterState({
                    ...filterState,
                    credit_id: ((_a2 = e.target) == null ? void 0 : _a2.value) || ""
                  });
                }
              })
            }), /* @__PURE__ */ jsx("s-box", {
              inlineSize: "200px",
              children: /* @__PURE__ */ jsx("s-number-field", {
                label: "Referencia",
                name: "reference",
                min: 0,
                step: 1,
                inputMode: "numeric",
                value: filterState.reference,
                onChange: (e) => {
                  var _a2;
                  return setFilterState({
                    ...filterState,
                    reference: ((_a2 = e.target) == null ? void 0 : _a2.value) || ""
                  });
                }
              })
            }), /* @__PURE__ */ jsx("s-box", {
              inlineSize: "220px",
              children: /* @__PURE__ */ jsx("s-date-field", {
                label: "Fecha de pago",
                value: filterState.payment_date,
                onChange: (e) => {
                  var _a2;
                  return setFilterState({
                    ...filterState,
                    payment_date: ((_a2 = e.target) == null ? void 0 : _a2.value) || ""
                  });
                }
              })
            }), /* @__PURE__ */ jsx("s-box", {
              inlineSize: "140px",
              children: /* @__PURE__ */ jsxs("s-select", {
                label: "Estatus",
                value: filterState.status || "",
                onChange: (e) => {
                  var _a2;
                  return setFilterState({
                    ...filterState,
                    status: ((_a2 = e.target) == null ? void 0 : _a2.value) || ""
                  });
                },
                children: [/* @__PURE__ */ jsx("s-option", {
                  value: "",
                  children: "Todos"
                }), /* @__PURE__ */ jsx("s-option", {
                  value: "REGISTRADO",
                  children: "Registrado"
                }), /* @__PURE__ */ jsx("s-option", {
                  value: "APROBADO",
                  children: "Aprobado"
                }), /* @__PURE__ */ jsx("s-option", {
                  value: "EN_REVISION",
                  children: "En Revisión"
                }), /* @__PURE__ */ jsx("s-option", {
                  value: "RECHAZADO",
                  children: "Rechazado"
                }), /* @__PURE__ */ jsx("s-option", {
                  value: "CANCELADO",
                  children: "Cancelado"
                })]
              })
            }), /* @__PURE__ */ jsx("s-box", {
              inlineSize: "140px",
              children: /* @__PURE__ */ jsxs("s-select", {
                label: "Mostrar",
                value: filterState.limit || "10",
                onChange: (e) => {
                  var _a2;
                  return setFilterState({
                    ...filterState,
                    limit: ((_a2 = e.target) == null ? void 0 : _a2.value) || "10"
                  });
                },
                children: [/* @__PURE__ */ jsx("s-option", {
                  value: "10",
                  children: "10 resultados"
                }), /* @__PURE__ */ jsx("s-option", {
                  value: "20",
                  children: "20 resultados"
                }), /* @__PURE__ */ jsx("s-option", {
                  value: "50",
                  children: "50 resultados"
                }), /* @__PURE__ */ jsx("s-option", {
                  value: "100",
                  children: "100 resultados"
                })]
              })
            })]
          })
        }), /* @__PURE__ */ jsxs("s-stack", {
          direction: "inline",
          gap: "small",
          justifyContent: "space-between",
          alignItems: "center",
          children: [/* @__PURE__ */ jsx("s-button", {
            variant: "primary",
            onClick: handleSearch,
            children: "Buscar"
          }), /* @__PURE__ */ jsx("s-button", {
            variant: "tertiary",
            tone: "neutral",
            onClick: clearSearch,
            children: "Limpiar"
          }), /* @__PURE__ */ jsx("s-button", {
            variant: "secondary",
            accessibilityLabel: "Opciones de exportación",
            commandFor: "export-popover",
            command: "--toggle",
            children: "Exportar"
          }), /* @__PURE__ */ jsx("s-popover", {
            id: "export-popover",
            children: /* @__PURE__ */ jsxs("s-stack", {
              direction: "block",
              gap: "small",
              padding: "base",
              children: [/* @__PURE__ */ jsx("s-button", {
                accessibilityLabel: "Exportar como CSV",
                variant: "tertiary",
                onClick: () => handleExport("csv"),
                children: "Exportar a CSV"
              }), /* @__PURE__ */ jsx("s-button", {
                accessibilityLabel: "Exportar como XLSX",
                variant: "tertiary",
                onClick: () => handleExport("xlsx"),
                children: "Exportar a XLSX"
              }), /* @__PURE__ */ jsx("s-button", {
                accessibilityLabel: "Exportar como PDF",
                variant: "tertiary",
                onClick: () => handleExport("pdf"),
                children: "Exportar a PDF"
              })]
            })
          }), /* @__PURE__ */ jsxs("s-stack", {
            direction: "inline",
            gap: "small",
            alignItems: "center",
            children: [/* @__PURE__ */ jsxs("s-text", {
              color: "subdued",
              children: [selectedIds.size, " seleccionados"]
            }), /* @__PURE__ */ jsx("s-button", {
              tone: "auto",
              icon: "check",
              disabled: selectedIds.size === 0 || hasApprovedSelected || loading || void 0,
              onClick: () => handleBatchReview("APROBADO"),
              accessibilityLabel: "Aprobar pagos seleccionados",
              children: "Aprobar Pago"
            }), /* @__PURE__ */ jsx("s-button", {
              tone: "critical",
              icon: "delete",
              disabled: selectedIds.size === 0 || loading || void 0,
              onClick: () => handleBatchReview("RECHAZADO"),
              accessibilityLabel: "Rechazar pagos seleccionados",
              children: "Rechazar Pago"
            }), /* @__PURE__ */ jsx("s-button", {
              variant: "secondary",
              tone: "critical",
              icon: "delete",
              disabled: selectedIds.size === 0 || loading || void 0,
              onClick: handleBatchCancel,
              accessibilityLabel: "Cancelar pagos seleccionados y revertir monto al crédito",
              children: "Cancelar Pago"
            }), /* @__PURE__ */ jsx("s-button", {
              tone: "critical",
              variant: "secondary",
              icon: "delete",
              disabled: selectedIds.size === 0 || loading || void 0,
              onClick: handleBatchDelete,
              accessibilityLabel: "Eliminar pagos seleccionados",
              children: "Eliminar Pago"
            })]
          })]
        })]
      }), /* @__PURE__ */ jsxs("s-table", {
        paginate: true,
        loading: loading || void 0,
        hasNextPage: payments.length === pageSize,
        hasPreviousPage: loaderPage > 1,
        onNextPage: () => {
          const searchParams = new URLSearchParams(window.location.search);
          searchParams.set("page", String(loaderPage + 1));
          submit(searchParams, {
            method: "get"
          });
        },
        onPreviousPage: () => {
          const searchParams = new URLSearchParams(window.location.search);
          searchParams.set("page", String(Math.max(1, loaderPage - 1)));
          submit(searchParams, {
            method: "get"
          });
        },
        children: [/* @__PURE__ */ jsxs("s-table-header-row", {
          children: [/* @__PURE__ */ jsx("s-table-header", {
            children: /* @__PURE__ */ jsx("input", {
              type: "checkbox",
              onChange: (e) => handleSelectAll(e.target.checked),
              checked: payments.length > 0 && selectedIds.size === payments.length
            })
          }), /* @__PURE__ */ jsx("s-table-header", {
            format: "numeric",
            children: "ID Pago"
          }), /* @__PURE__ */ jsx("s-table-header", {
            format: "numeric",
            children: "ID Crédito"
          }), /* @__PURE__ */ jsx("s-table-header", {
            children: "Fecha Pago"
          }), /* @__PURE__ */ jsx("s-table-header", {
            children: "Cliente"
          }), /* @__PURE__ */ jsx("s-table-header", {
            format: "numeric",
            children: "Total Crédito"
          }), /* @__PURE__ */ jsx("s-table-header", {
            format: "numeric",
            children: "Cuotas Pagadas"
          }), /* @__PURE__ */ jsx("s-table-header", {
            children: "Método"
          }), /* @__PURE__ */ jsx("s-table-header", {
            format: "numeric",
            children: "Abono"
          }), /* @__PURE__ */ jsx("s-table-header", {
            format: "numeric",
            children: "Balance Cliente"
          }), /* @__PURE__ */ jsx("s-table-header", {
            format: "numeric",
            children: "Balance Restante Crédito"
          }), /* @__PURE__ */ jsx("s-table-header", {
            children: "Referencia"
          }), /* @__PURE__ */ jsx("s-table-header", {
            children: "Estado"
          }), /* @__PURE__ */ jsx("s-table-header", {
            children: "Acciones"
          })]
        }), /* @__PURE__ */ jsxs("s-table-body", {
          children: [payments.map((payment) => {
            var _a2;
            const creditTotal = Number(payment.credit_total_amount);
            const abono = Number(payment.amount);
            const diff = creditTotal - abono;
            const saldoRestante = Math.max(0, diff);
            const saldoAFavor = Math.max(0, abono - creditTotal);
            payment.installments_covered ? payment.installments_covered.split(",").filter((x) => x.trim()).length.toString() + " Cuota(s)" : "-";
            let cuotasCubiertas = "-";
            if (payment.installments_covered) {
              cuotasCubiertas = payment.installments_covered.split(",").filter((x) => x.trim()).length.toString() + " Cuota(s)";
            }
            return /* @__PURE__ */ jsxs("s-table-row", {
              children: [/* @__PURE__ */ jsx("s-table-cell", {
                children: /* @__PURE__ */ jsx("s-checkbox", {
                  checked: selectedIds.has(payment.id),
                  onChange: () => toggleSelect(payment.id)
                })
              }), /* @__PURE__ */ jsx("s-table-cell", {
                children: payment.id
              }), /* @__PURE__ */ jsx("s-table-cell", {
                children: payment.credit_id
              }), /* @__PURE__ */ jsx("s-table-cell", {
                children: /* @__PURE__ */ jsx(ClientDate, {
                  dateString: payment.payment_date
                })
              }), /* @__PURE__ */ jsx("s-table-cell", {
                children: payment.customer_name
              }), /* @__PURE__ */ jsxs("s-table-cell", {
                children: ["$", creditTotal.toFixed(2)]
              }), /* @__PURE__ */ jsx("s-table-cell", {
                children: cuotasCubiertas
              }), /* @__PURE__ */ jsx("s-table-cell", {
                children: /* @__PURE__ */ jsxs("s-stack", {
                  direction: "block",
                  gap: "none",
                  children: [/* @__PURE__ */ jsx("s-text", {
                    type: "strong",
                    children: payment.payment_method ? payment.payment_method === "CASH" ? "Efectivo USD" : payment.payment_method === "EFECTIVO" ? "Efectivo VEF" : payment.payment_method === "BANK" ? "Transferencia Bancaria" : payment.payment_method === "PAGO_MOVIL" ? "Pago Móvil" : payment.payment_method : "N/A"
                  }), payment.bank_name ? /* @__PURE__ */ jsx("s-text", {
                    color: "subdued",
                    children: payment.bank_name
                  }) : null]
                })
              }), /* @__PURE__ */ jsxs("s-table-cell", {
                children: ["$", abono.toFixed(2)]
              }), /* @__PURE__ */ jsxs("s-table-cell", {
                children: ["$", saldoAFavor.toFixed(2)]
              }), /* @__PURE__ */ jsxs("s-table-cell", {
                children: ["$", saldoRestante.toFixed(2)]
              }), /* @__PURE__ */ jsx("s-table-cell", {
                children: ((_a2 = payment.reference_number) == null ? void 0 : _a2.startsWith("INTENT-")) ? `RECORDATORIO-${payment.reference_number.split("-")[1]}-ENVIADO` : payment.reference_number
              }), /* @__PURE__ */ jsx("s-table-cell", {
                children: /* @__PURE__ */ jsx("s-badge", {
                  tone: getStatusTone(payment.status),
                  children: payment.status
                })
              }), /* @__PURE__ */ jsx("s-table-cell", {
                children: /* @__PURE__ */ jsx("s-stack", {
                  gap: "small",
                  children: /* @__PURE__ */ jsxs("s-button-group", {
                    children: [/* @__PURE__ */ jsx("s-button", {
                      slot: "secondary-actions",
                      icon: "view",
                      href: `/app/payment_detail/${payment.id}`,
                      accessibilityLabel: "Ver detalles de este pago",
                      children: "Ver Pago"
                    }), /* @__PURE__ */ jsx("s-button", {
                      slot: "secondary-actions",
                      variant: "secondary",
                      icon: "credit-card",
                      href: `/app/credit_detail/${payment.credit_id}`,
                      accessibilityLabel: "Ver crédito asociado a pago",
                      children: "Ver Crédito"
                    }), payment.status !== "EN_REVISION" && /* @__PURE__ */ jsx("s-button", {
                      slot: "secondary-actions",
                      variant: "secondary",
                      icon: "undo",
                      onClick: () => handleRevertPayment(payment.id),
                      accessibilityLabel: "Revertir el estado de este pago a revisión",
                      children: "Revertir"
                    })]
                  })
                })
              })]
            }, payment.id);
          }), !loading && payments.length === 0 && /* @__PURE__ */ jsx("s-table-row", {
            children: /* @__PURE__ */ jsx("s-table-cell", {
              children: /* @__PURE__ */ jsx("div", {
                style: {
                  textAlign: "center",
                  gridColumn: "span 11"
                },
                children: /* @__PURE__ */ jsx("s-text", {
                  color: "subdued",
                  children: "No se encontraron pagos registrados."
                })
              })
            })
          })]
        })]
      }), /* @__PURE__ */ jsx("s-divider", {}), /* @__PURE__ */ jsxs("s-stack", {
        direction: "inline",
        gap: "small",
        padding: "base",
        justifyContent: "end",
        alignItems: "center",
        children: [/* @__PURE__ */ jsxs("s-text", {
          color: "subdued",
          children: [selectedIds.size, " seleccionados"]
        }), /* @__PURE__ */ jsx("s-button", {
          tone: "auto",
          icon: "check",
          disabled: selectedIds.size === 0 || hasApprovedSelected || loading || void 0,
          onClick: () => handleBatchReview("APROBADO"),
          accessibilityLabel: "Aprobar pagos seleccionados",
          children: "Aprobar Pago"
        }), /* @__PURE__ */ jsx("s-button", {
          tone: "critical",
          icon: "delete",
          disabled: selectedIds.size === 0 || loading || void 0,
          onClick: () => handleBatchReview("RECHAZADO"),
          accessibilityLabel: "Rechazar pagos seleccionados",
          children: "Rechazar Pago"
        }), /* @__PURE__ */ jsx("s-button", {
          variant: "secondary",
          tone: "critical",
          icon: "delete",
          disabled: selectedIds.size === 0 || loading || void 0,
          onClick: handleBatchCancel,
          accessibilityLabel: "Cancelar pagos seleccionados y revertir monto al crédito",
          children: "Cancelar Pago"
        }), /* @__PURE__ */ jsx("s-button", {
          tone: "critical",
          variant: "secondary",
          icon: "delete",
          disabled: selectedIds.size === 0 || loading || void 0,
          onClick: handleBatchDelete,
          accessibilityLabel: "Eliminar pagos seleccionados",
          children: "Eliminar Pago"
        })]
      })]
    }), /* @__PURE__ */ jsx("s-divider", {}), /* @__PURE__ */ jsxs("s-stack", {
      padding: "base",
      alignItems: "center",
      children: [/* @__PURE__ */ jsx("s-text", {
        color: "subdued",
        children: "Desarrollado por Opentech LCC"
      }), /* @__PURE__ */ jsxs("s-text", {
        children: ["¿Tienes alguna duda?", " ", /* @__PURE__ */ jsx("s-link", {
          href: "https://lccopen.tech/contact",
          target: "_blank",
          children: "Contáctanos"
        }), "."]
      })]
    })]
  });
});
const route14 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$2,
  default: app_payments,
  headers: headers$3,
  loader: loader$3
}, Symbol.toStringTag, { value: "Module" }));
const VENEZUELAN_BANKS = ["(0001) BANCO CENTRAL DE VENEZUELA", "(0102) BANCO DE VENEZUELA, S.A. BANCO UNIVERSAL", "(0104) BANCO VENEZOLANO DE CRÉDITO, S.A BANCO UNIVERSAL", "(0105) BANCO MERCANTIL C.A., BANCO UNIVERSAL", "(0108) BANCO PROVINCIAL, S.A. BANCO UNIVERSAL", "(0114) BANCO DEL CARIBE C.A., BANCO UNIVERSAL", "(0115) BANCO EXTERIOR C.A., BANCO UNIVERSAL", "(0128) BANCO CARONÍ C.A., BANCO UNIVERSAL", "(0134) BANESCO BANCO UNIVERSAL, C.A.", "(0137) BANCO SOFITASA BANCO UNIVERSAL, C.A .", "(0138) BANCO PLAZA, BANCO UNIVERSAL", "(0146) BANCO DE LA GENTE EMPRENDEDORA C.A.", "(0151) BANCO FONDO COMÚN, C.A BANCO UNIVERSAL", "(0156) 100% BANCO, BANCO COMERCIAL, C.A", "(0157) DELSUR, BANCO UNIVERSAL C.A.", "(0163) BANCO DEL TESORO C.A., BANCO UNIVERSAL", "(0166) BANCO AGRÍCOLA DE VENEZUELA C.A., BANCO UNIVERSAL", "(0168) BANCRECER S.A., BANCO MICROFINANCIERO", "(0169) R4, BANCO MICROFINANCIERO, C.A.", "(0171) BANCO ACTIVO C.A., BANCO UNIVERSAL", "(0172) BANCAMIGA BANCO UNIVERSAL, C.A.", "(0173) BANCO INTERNACIONAL DE DESARROLLO C.A., BANCO UNIVERSAL", "(0174) BANPLUS BANCO UNIVERSAL, C.A.", "(0175) BANCO DIGITAL DE LOS TRABAJADORES, BANCO UNIVERSAL C.A.", "(0177) BANCO DE LA FUERZA ARMADA NACIONAL BOLIVARIANA, B.U.", "(0178) N58 BANCO DIGITAL, BANCO MICROFINANCIERO", "(0191) BANCO NACIONAL DE CRÉDITO C.A., BANCO UNIVERSAL", "(0601) INSTITUTO MUNICIPAL DE CRÉDITO POPULAR"];
const DEFAULT_PAGO_MOVIL = {
  banco: "(0102) BANCO DE VENEZUELA, S.A. BANCO UNIVERSAL",
  telefono: "",
  tipoCi: "V",
  ci: ""
};
const DEFAULT_TRANSFERENCIA = {
  banco: "(0102) BANCO DE VENEZUELA, S.A. BANCO UNIVERSAL",
  numero: "",
  tipoCi: "V",
  ci: ""
};
const loader$2 = async ({
  request
}) => {
  const {
    session
  } = await authenticate.admin(request);
  const accessToken = await getAccessTokenForShop(session.shop);
  if (!accessToken) throw new Error("Token no disponible");
  const BACKEND_URL2 = process.env.BACKEND_URL || "http://localhost:8000";
  const res = await fetch(`${BACKEND_URL2}/api/merchants/settings`, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });
  if (!res.ok) throw new Error("Error cargando settings");
  const data = await res.json();
  return {
    settings: data
  };
};
const action$1 = async ({
  request
}) => {
  const {
    session
  } = await authenticate.admin(request);
  const accessToken = await getAccessTokenForShop(session.shop);
  const formData = await request.formData();
  const pagoMovil = JSON.parse(formData.get("pagoMovil"));
  const transferencia = JSON.parse(formData.get("transferencia"));
  const binance = formData.get("binance") ? JSON.parse(formData.get("binance")) : null;
  const zelle = formData.get("zelle") ? JSON.parse(formData.get("zelle")) : null;
  const zinli = formData.get("zinli") ? JSON.parse(formData.get("zinli")) : null;
  const debito = formData.get("debito") ? JSON.parse(formData.get("debito")) : null;
  const general = formData.get("general") ? JSON.parse(formData.get("general")) : null;
  const BACKEND_URL2 = process.env.BACKEND_URL || "http://localhost:8000";
  const res = await fetch(`${BACKEND_URL2}/api/merchants/settings`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`
    },
    body: JSON.stringify({
      pago_movil: pagoMovil,
      transferencia,
      binance,
      zelle,
      zinli,
      debito,
      general
    })
  });
  if (!res.ok) return {
    success: false
  };
  return {
    success: true
  };
};
const headers$2 = () => ({
  "Cache-Control": "no-cache, no-store, must-revalidate"
});
const app_settings = UNSAFE_withComponentProps(function Settings() {
  const {
    settings
  } = useLoaderData();
  const submit = useSubmit();
  const navigation = useNavigation();
  const actionData = useActionData();
  const [pagoMovil, setPagoMovil] = useState((settings == null ? void 0 : settings.pago_movil) ? {
    ...DEFAULT_PAGO_MOVIL,
    ...settings.pago_movil
  } : DEFAULT_PAGO_MOVIL);
  const [transferencia, setTransferencia] = useState((settings == null ? void 0 : settings.transferencia) ? {
    ...DEFAULT_TRANSFERENCIA,
    ...settings.transferencia
  } : DEFAULT_TRANSFERENCIA);
  const [binance, setBinance] = useState((settings == null ? void 0 : settings.binance) ? {
    enabled: false,
    details: "",
    ...settings.binance
  } : {
    enabled: false,
    details: ""
  });
  const [zelle, setZelle] = useState((settings == null ? void 0 : settings.zelle) ? {
    enabled: false,
    details: "",
    ...settings.zelle
  } : {
    enabled: false,
    details: ""
  });
  const [zinli, setZinli] = useState((settings == null ? void 0 : settings.zinli) ? {
    enabled: false,
    details: "",
    ...settings.zinli
  } : {
    enabled: false,
    details: ""
  });
  const [debito, setDebito] = useState((settings == null ? void 0 : settings.debito) ? {
    enabled: false,
    details: "",
    ...settings.debito
  } : {
    enabled: false,
    details: ""
  });
  const [general, setGeneral] = useState((settings == null ? void 0 : settings.general) ? {
    silence_notifications: false,
    block_bad_reputation: false,
    ...settings.general
  } : {
    silence_notifications: false,
    block_bad_reputation: false
  });
  const [paypal, setPaypal] = useState({
    email: "",
    titular: ""
  });
  const [saveStatus, setSaveStatus] = useState("idle");
  useEffect(() => {
    if (navigation.state === "submitting") {
      setSaveStatus("saving");
    } else if (navigation.state === "idle" && actionData !== void 0) {
      setSaveStatus(actionData.success ? "saved" : "error");
      const timer = setTimeout(() => setSaveStatus("idle"), 3e3);
      return () => clearTimeout(timer);
    }
  }, [navigation.state, actionData]);
  const handleSave = () => {
    submit({
      pagoMovil: JSON.stringify(pagoMovil),
      transferencia: JSON.stringify(transferencia),
      binance: JSON.stringify(binance),
      zelle: JSON.stringify(zelle),
      zinli: JSON.stringify(zinli),
      debito: JSON.stringify(debito),
      general: JSON.stringify(general)
    }, {
      method: "post"
    });
  };
  return /* @__PURE__ */ jsxs("s-page", {
    inlineSize: "base",
    children: [/* @__PURE__ */ jsxs("s-section", {
      heading: "Métodos de Pago",
      children: [/* @__PURE__ */ jsxs("s-grid", {
        gridTemplateColumns: "repeat(2, 1fr)",
        gap: "base",
        padding: "base",
        children: [/* @__PURE__ */ jsx("s-grid-item", {
          children: /* @__PURE__ */ jsx("s-box", {
            border: "base",
            borderRadius: "base",
            padding: "base",
            children: /* @__PURE__ */ jsxs("s-stack", {
              gap: "base",
              children: [/* @__PURE__ */ jsx("s-heading", {
                children: "Pago Móvil"
              }), /* @__PURE__ */ jsx("s-divider", {}), /* @__PURE__ */ jsx("s-select", {
                label: "Banco",
                value: pagoMovil.banco,
                onChange: (e) => setPagoMovil({
                  ...pagoMovil,
                  banco: e.target.value
                }),
                children: VENEZUELAN_BANKS.map((bank) => /* @__PURE__ */ jsx("s-option", {
                  value: bank,
                  children: bank
                }, bank))
              }), /* @__PURE__ */ jsx("s-text-field", {
                label: "Teléfono",
                value: pagoMovil.telefono,
                onChange: (e) => setPagoMovil({
                  ...pagoMovil,
                  telefono: e.target.value
                })
              }), /* @__PURE__ */ jsxs("s-grid", {
                gridTemplateColumns: "1fr 3fr",
                gap: "small",
                alignItems: "end",
                children: [/* @__PURE__ */ jsxs("s-select", {
                  label: "Tipo",
                  value: pagoMovil.tipoCi,
                  onChange: (e) => setPagoMovil({
                    ...pagoMovil,
                    tipoCi: e.target.value
                  }),
                  children: [/* @__PURE__ */ jsx("s-option", {
                    value: "V",
                    children: "V"
                  }), /* @__PURE__ */ jsx("s-option", {
                    value: "J",
                    children: "J"
                  }), /* @__PURE__ */ jsx("s-option", {
                    value: "E",
                    children: "E"
                  })]
                }), /* @__PURE__ */ jsx("s-text-field", {
                  label: "Documento de Identidad",
                  value: pagoMovil.ci,
                  onChange: (e) => setPagoMovil({
                    ...pagoMovil,
                    ci: e.target.value
                  })
                })]
              })]
            })
          })
        }), /* @__PURE__ */ jsx("s-grid-item", {
          children: /* @__PURE__ */ jsx("s-box", {
            border: "base",
            borderRadius: "base",
            padding: "base",
            children: /* @__PURE__ */ jsxs("s-stack", {
              gap: "base",
              children: [/* @__PURE__ */ jsx("s-heading", {
                children: "Transferencia Bancaria"
              }), /* @__PURE__ */ jsx("s-divider", {}), /* @__PURE__ */ jsx("s-select", {
                label: "Banco",
                value: transferencia.banco,
                onChange: (e) => setTransferencia({
                  ...transferencia,
                  banco: e.target.value
                }),
                children: VENEZUELAN_BANKS.map((bank) => /* @__PURE__ */ jsx("s-option", {
                  value: bank,
                  children: bank
                }, bank))
              }), /* @__PURE__ */ jsx("s-text-field", {
                label: "Número de Cuenta",
                value: transferencia.numero,
                onChange: (e) => setTransferencia({
                  ...transferencia,
                  numero: e.target.value
                })
              }), /* @__PURE__ */ jsxs("s-grid", {
                gridTemplateColumns: "1fr 3fr",
                gap: "small",
                alignItems: "end",
                children: [/* @__PURE__ */ jsxs("s-select", {
                  label: "Tipo",
                  value: transferencia.tipoCi,
                  onChange: (e) => setTransferencia({
                    ...transferencia,
                    tipoCi: e.target.value
                  }),
                  children: [/* @__PURE__ */ jsx("s-option", {
                    value: "V",
                    children: "V"
                  }), /* @__PURE__ */ jsx("s-option", {
                    value: "J",
                    children: "J"
                  }), /* @__PURE__ */ jsx("s-option", {
                    value: "E",
                    children: "E"
                  })]
                }), /* @__PURE__ */ jsx("s-text-field", {
                  label: "Documento de Identidad",
                  value: transferencia.ci,
                  onChange: (e) => setTransferencia({
                    ...transferencia,
                    ci: e.target.value
                  })
                })]
              })]
            })
          })
        })]
      }), /* @__PURE__ */ jsxs("s-grid", {
        gridTemplateColumns: "repeat(2, 1fr)",
        gap: "base",
        padding: "base",
        children: [/* @__PURE__ */ jsx("s-grid-item", {
          children: /* @__PURE__ */ jsx("s-box", {
            border: "base",
            borderRadius: "base",
            padding: "base",
            children: /* @__PURE__ */ jsxs("s-stack", {
              gap: "base",
              children: [/* @__PURE__ */ jsx("s-heading", {
                children: "Binance"
              }), /* @__PURE__ */ jsx("s-divider", {}), /* @__PURE__ */ jsx("s-checkbox", {
                label: "Habilitar Binance",
                checked: binance.enabled,
                onChange: (e) => setBinance({
                  ...binance,
                  enabled: e.target.checked
                })
              }), binance.enabled && /* @__PURE__ */ jsx("s-text-field", {
                label: "Email o Pay ID",
                value: binance.details,
                onChange: (e) => setBinance({
                  ...binance,
                  details: e.target.value
                })
              })]
            })
          })
        }), /* @__PURE__ */ jsx("s-grid-item", {
          children: /* @__PURE__ */ jsx("s-box", {
            border: "base",
            borderRadius: "base",
            padding: "base",
            children: /* @__PURE__ */ jsxs("s-stack", {
              gap: "base",
              children: [/* @__PURE__ */ jsx("s-heading", {
                children: "Zelle"
              }), /* @__PURE__ */ jsx("s-divider", {}), /* @__PURE__ */ jsx("s-checkbox", {
                label: "Habilitar Zelle",
                checked: zelle.enabled,
                onChange: (e) => setZelle({
                  ...zelle,
                  enabled: e.target.checked
                })
              }), zelle.enabled && /* @__PURE__ */ jsx("s-text-field", {
                label: "Email o Teléfono",
                value: zelle.details,
                onChange: (e) => setZelle({
                  ...zelle,
                  details: e.target.value
                })
              })]
            })
          })
        }), /* @__PURE__ */ jsx("s-grid-item", {
          children: /* @__PURE__ */ jsx("s-box", {
            border: "base",
            borderRadius: "base",
            padding: "base",
            children: /* @__PURE__ */ jsxs("s-stack", {
              gap: "base",
              children: [/* @__PURE__ */ jsx("s-heading", {
                children: "Zinli"
              }), /* @__PURE__ */ jsx("s-divider", {}), /* @__PURE__ */ jsx("s-checkbox", {
                label: "Habilitar Zinli",
                checked: zinli.enabled,
                onChange: (e) => setZinli({
                  ...zinli,
                  enabled: e.target.checked
                })
              }), zinli.enabled && /* @__PURE__ */ jsx("s-text-field", {
                label: "Email",
                value: zinli.details,
                onChange: (e) => setZinli({
                  ...zinli,
                  details: e.target.value
                })
              })]
            })
          })
        }), /* @__PURE__ */ jsx("s-grid-item", {
          children: /* @__PURE__ */ jsx("s-box", {
            border: "base",
            borderRadius: "base",
            padding: "base",
            children: /* @__PURE__ */ jsxs("s-stack", {
              gap: "base",
              children: [/* @__PURE__ */ jsx("s-heading", {
                children: "Débito (POS)"
              }), /* @__PURE__ */ jsx("s-divider", {}), /* @__PURE__ */ jsx("s-checkbox", {
                label: "Habilitar Punto de Venta",
                checked: debito.enabled,
                onChange: (e) => setDebito({
                  ...debito,
                  enabled: e.target.checked
                })
              }), debito.enabled && /* @__PURE__ */ jsx("s-text-field", {
                label: "Información Adicional (Opcional)",
                value: debito.details,
                onChange: (e) => setDebito({
                  ...debito,
                  details: e.target.value
                })
              })]
            })
          })
        })]
      }), /* @__PURE__ */ jsxs("s-stack", {
        direction: "inline",
        justifyContent: "end",
        padding: "base",
        gap: "small",
        alignItems: "center",
        children: [saveStatus === "saved" && /* @__PURE__ */ jsx("s-text", {
          tone: "success",
          children: "✓ Cambios guardados"
        }), saveStatus === "error" && /* @__PURE__ */ jsx("s-text", {
          tone: "critical",
          children: "✗ Error al guardar"
        }), /* @__PURE__ */ jsx("s-button", {
          variant: "primary",
          onClick: handleSave,
          disabled: saveStatus === "saving" || void 0,
          accessibilityLabel: "Guardar cambios de configuración",
          children: saveStatus === "saving" ? "Guardando..." : "Guardar Cambios"
        })]
      })]
    }), /* @__PURE__ */ jsx("s-section", {
      heading: "Configuración General e Integraciones",
      children: /* @__PURE__ */ jsx("s-grid", {
        gridTemplateColumns: "1fr",
        gap: "base",
        padding: "base",
        children: /* @__PURE__ */ jsx("s-grid-item", {
          children: /* @__PURE__ */ jsx("s-box", {
            border: "base",
            borderRadius: "base",
            padding: "base",
            children: /* @__PURE__ */ jsxs("s-stack", {
              gap: "base",
              children: [/* @__PURE__ */ jsx("s-heading", {
                children: "Políticas y Alertas de la Tienda"
              }), /* @__PURE__ */ jsx("s-divider", {}), /* @__PURE__ */ jsx("s-checkbox", {
                label: "Silenciar alertas de la campanita (no recibir notificaciones flotantes al registrar pagos)",
                checked: general.silence_notifications,
                onChange: (e) => setGeneral({
                  ...general,
                  silence_notifications: e.target.checked
                })
              }), /* @__PURE__ */ jsx("s-checkbox", {
                label: "Bloqueo automático de créditos para clientes con mala reputación (requiere bypass manual del admin)",
                checked: general.block_bad_reputation,
                onChange: (e) => setGeneral({
                  ...general,
                  block_bad_reputation: e.target.checked
                })
              })]
            })
          })
        })
      })
    }), /* @__PURE__ */ jsx("s-section", {
      heading: "Tools",
      children: /* @__PURE__ */ jsxs("s-stack", {
        gap: "none",
        border: "base",
        borderRadius: "base",
        overflow: "hidden",
        children: [/* @__PURE__ */ jsx("s-box", {
          padding: "small-100",
          children: /* @__PURE__ */ jsxs("s-grid", {
            gridTemplateColumns: "1fr auto",
            alignItems: "center",
            gap: "base",
            children: [/* @__PURE__ */ jsxs("s-box", {
              children: [/* @__PURE__ */ jsx("s-heading", {
                children: "Restablecer configuraciones de la app"
              }), /* @__PURE__ */ jsx("s-paragraph", {
                color: "subdued",
                children: "Restablecer todas las configuraciones por defecti. Esta acción no puede deshacerse."
              })]
            }), /* @__PURE__ */ jsx("s-button", {
              tone: "critical",
              accessibilityLabel: "Restablecer configuraciones de la aplicación",
              children: "Restablecer"
            })]
          })
        }), /* @__PURE__ */ jsx("s-box", {
          paddingInline: "small-100",
          children: /* @__PURE__ */ jsx("s-divider", {})
        })]
      })
    }), /* @__PURE__ */ jsxs("s-stack", {
      padding: "base",
      alignItems: "center",
      gap: "base",
      children: [/* @__PURE__ */ jsx("s-text", {
        color: "subdued",
        children: "Desarrollado por Opentech LCC"
      }), /* @__PURE__ */ jsxs("s-text", {
        children: ["¿Tienes alguna duda?", " ", /* @__PURE__ */ jsx("s-link", {
          href: "https://lccopen.tech/contact",
          target: "_blank",
          children: "Contáctanos"
        }), "."]
      })]
    })]
  });
});
const route15 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$1,
  default: app_settings,
  headers: headers$2,
  loader: loader$2
}, Symbol.toStringTag, { value: "Module" }));
function isDocumentRequest(request) {
  const accept = request.headers.get("Accept") || "";
  const xrw = request.headers.get("X-Requested-With") || "";
  return accept.includes("text/html") && xrw !== "XMLHttpRequest";
}
const loader$1 = async ({
  request
}) => {
  var _a2, _b;
  let session;
  let admin;
  try {
    ({
      session,
      admin
    } = await authenticate.admin(request));
  } catch (error) {
    if (error instanceof Response && error.status === 401 && isDocumentRequest(request)) {
      const url2 = new URL(request.url);
      const shop = url2.searchParams.get("shop");
      if (shop) {
        return redirect$1(`/auth?shop=${shop}`);
      }
    }
    throw error;
  }
  const accessToken = await getAccessTokenForShop(session.shop);
  if (!accessToken) {
    throw new Error("Token no disponible");
  }
  const url = new URL(request.url);
  const credit_id = url.searchParams.get("credit_id") || "";
  const customer_name = url.searchParams.get("customer_name") || "";
  const document_type = url.searchParams.get("document_type") || "";
  const document_id = url.searchParams.get("document_id") || "";
  const created_at_date = url.searchParams.get("created_at_date") || "";
  const due_date = url.searchParams.get("due_date") || "";
  const status = url.searchParams.get("status") || "";
  const params = new URLSearchParams();
  if (credit_id) params.append("credit_id", credit_id);
  if (customer_name) params.append("customer_name", customer_name);
  if (created_at_date) params.append("created_at_date", created_at_date);
  if (due_date) params.append("due_date", due_date);
  if (status) params.append("status", status);
  if (document_type || document_id) {
    try {
      const gqlRes = await admin.graphql(`
        {
          customers(first: 250) {
            nodes {
              id
              metafields(first: 20) {
                nodes {
                  key
                  value
                }
              }
            }
          }
        }
      `);
      const {
        data
      } = await gqlRes.json();
      const shopifyCustomers = ((_a2 = data == null ? void 0 : data.customers) == null ? void 0 : _a2.nodes) ?? [];
      let matchId = "-1";
      for (const c of shopifyCustomers) {
        const mfs = ((_b = c.metafields) == null ? void 0 : _b.nodes) || [];
        let typeMatch = !document_type;
        let numMatch = !document_id;
        for (const mf of mfs) {
          const val = mf.value || "";
          const key = mf.key.toLowerCase();
          if (document_type && !typeMatch) {
            if ((key.includes("tipo") || key.includes("doc")) && val.includes(document_type)) {
              typeMatch = true;
            }
          }
          if (document_id && !numMatch) {
            if ((key === "n" || key.includes("num") || key.includes("n_") || key.includes("doc")) && val.includes(document_id)) {
              numMatch = true;
            }
          }
        }
        if (typeMatch && numMatch) {
          matchId = c.id.split("/").pop() || "-1";
          break;
        }
      }
      params.append("customer_id", matchId);
    } catch (e) {
      console.error("Error fetching customers for document filter", e);
      params.append("customer_id", "-1");
    }
  }
  const BACKEND_URL2 = process.env.BACKEND_URL || "http://localhost:8000";
  const response = await fetch(`${BACKEND_URL2}/api/credits?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });
  if (!response.ok) {
    throw new Error("Error cargando créditos");
  }
  const credits = await response.json();
  return {
    credits,
    filters: {
      credit_id,
      customer_name,
      document_type,
      document_id,
      created_at_date,
      due_date,
      status
    }
  };
};
const action = async ({
  request
}) => {
  const {
    session
  } = await authenticate.admin(request);
  const accessToken = await getAccessTokenForShop(session.shop);
  const formData = await request.formData();
  const intent = formData.get("intent");
  const id = formData.get("id");
  const BACKEND_URL2 = process.env.BACKEND_URL || "http://localhost:8000";
  if (intent === "delete") {
    const res = await fetch(`${BACKEND_URL2}/api/credits/${id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });
    if (!res.ok) return {
      error: "No se pudo eliminar el crédito"
    };
    return {
      success: true
    };
  }
  if (intent === "cancel") {
    try {
      const res = await fetch(`${BACKEND_URL2}/api/credits/${id}/cancel`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`
        }
      });
      if (!res.ok) {
        const errText = await res.text();
        console.error("Cancel credit error:", errText);
        try {
          const errJson = JSON.parse(errText);
          return {
            error: errJson.detail || "No se pudo cancelar el crédito"
          };
        } catch (e) {
          return {
            error: `Error del servidor: ${errText.substring(0, 50)}...`
          };
        }
      }
      return {
        success: true
      };
    } catch (e) {
      console.error("Fetch exception on cancel in app.credits:", e);
      return {
        error: `Error de conexión: ${e.message}`
      };
    }
  }
  return null;
};
const headers$1 = () => ({
  "Cache-Control": "no-cache, no-store, must-revalidate"
});
const app_credits = UNSAFE_withComponentProps(function CreditHistorial() {
  const {
    credits: loaderCredits,
    filters
  } = useLoaderData();
  const submit = useSubmit();
  const navigation = useNavigation();
  const loading = navigation.state === "loading" || navigation.state === "submitting";
  const credits = loaderCredits;
  const [filterState, setFilterState] = useState(filters);
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const hasNextPage = credits.length === pageSize;
  const hasPreviousPage = page > 1;
  const handleSearch = () => {
    const fd = new FormData();
    Object.entries(filterState).forEach(([k, v]) => {
      if (v) fd.append(k, v);
    });
    submit(fd, {
      method: "get"
    });
  };
  const clearSearch = () => {
    setFilterState({
      credit_id: "",
      customer_name: "",
      document_type: "",
      document_id: "",
      created_at_date: "",
      due_date: "",
      status: ""
    });
    submit({}, {
      method: "get"
    });
  };
  const formatDate = (isoDate) => {
    if (!isoDate) return "—";
    return new Intl.DateTimeFormat("es-ES", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      timeZone: "UTC"
    }).format(new Date(isoDate));
  };
  const formatCurrency = (amount) => {
    if (amount == null) return "—";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD"
    }).format(Number(amount));
  };
  async function handleDelete(id) {
    const confirmed = window.confirm("¿Seguro que deseas eliminar este crédito? Esta acción no se puede deshacer.");
    if (!confirmed) return;
    submit({
      intent: "delete",
      id: id.toString()
    }, {
      method: "post"
    });
  }
  async function handleCancel(id, e) {
    if (e && e.preventDefault) e.preventDefault();
    const confirmed = window.confirm("¿Seguro que deseas cancelar este crédito? Los pagos esperados se eliminarán de la lista.");
    if (!confirmed) return;
    submit({
      intent: "cancel",
      id: id.toString()
    }, {
      method: "post"
    });
  }
  const formatNotes = (notes) => {
    if (!notes) return "—";
    let cleaned = notes.replace(/\[DISTRIBUTE_EXCESS\]/g, "Distribución de Excedente");
    cleaned = cleaned.replace(/Doc:\s*[^\|]+\|\s*Teléf:\s*[^\|]+\|\s*Extra:\s*.*/gi, "");
    return cleaned.trim() || "—";
  };
  const handleExport = (format) => {
    if (!format || !credits.length) return;
    const exportData = credits.map((c) => {
      var _a2;
      return {
        ID: c.id,
        Fecha: formatDate(c.created_at),
        Cliente: ((_a2 = c.customer) == null ? void 0 : _a2.full_name) || "Desconocido",
        "Monto Crédito": formatCurrency(c.total_amount),
        Balance: formatCurrency(c.balance),
        "Último Abono": formatCurrency(c.last_payment_amount),
        Estatus: c.status
      };
    });
    if (format === "csv" || format === "xlsx") {
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Creditos");
      if (format === "csv") {
        XLSX.writeFile(wb, "creditos.csv");
      } else {
        XLSX.writeFile(wb, "creditos.xlsx");
      }
    } else if (format === "pdf") {
      const doc = new jsPDF();
      doc.text("Reporte de Créditos", 14, 15);
      autoTable(doc, {
        startY: 20,
        head: [["ID", "Fecha", "Cliente", "Monto Crédito", "Balance", "Último Abono", "Estatus"]],
        body: exportData.map((d) => [d.ID, d.Fecha, d.Cliente, d["Monto Crédito"], d.Balance, d["Último Abono"], d.Estatus])
      });
      doc.save("creditos.pdf");
    }
  };
  return /* @__PURE__ */ jsxs("s-page", {
    heading: "Créditos",
    inlineSize: "large",
    children: [/* @__PURE__ */ jsx("s-button", {
      variant: "primary",
      slot: "primary-action",
      href: "/app/registre_credit",
      accessibilityLabel: "Ir a registrar crédito",
      children: "Registrar Crédito"
    }), /* @__PURE__ */ jsxs("s-section", {
      padding: "base",
      children: [/* @__PURE__ */ jsx("s-heading", {
        children: "Lista de Créditos Emitidos"
      }), /* @__PURE__ */ jsxs("s-stack", {
        direction: "block",
        gap: "small",
        paddingBlockEnd: "base",
        children: [/* @__PURE__ */ jsx("s-stack", {
          direction: "inline",
          gap: "small",
          alignItems: "end",
          justifyContent: "space-between",
          children: /* @__PURE__ */ jsxs("s-stack", {
            direction: "inline",
            gap: "small",
            children: [/* @__PURE__ */ jsx("s-box", {
              inlineSize: "220px",
              children: /* @__PURE__ */ jsx("s-search-field", {
                label: "Cliente",
                placeholder: "Buscar por cliente...",
                value: filterState.customer_name,
                onInput: (e) => setFilterState({
                  ...filterState,
                  customer_name: e.currentTarget.value
                })
              })
            }), /* @__PURE__ */ jsx("s-box", {
              inlineSize: "120px",
              children: /* @__PURE__ */ jsxs("s-select", {
                label: "Tipo Doc.",
                value: filterState.document_type,
                onChange: (e) => {
                  var _a2;
                  return setFilterState({
                    ...filterState,
                    document_type: ((_a2 = e.target) == null ? void 0 : _a2.value) || ""
                  });
                },
                children: [/* @__PURE__ */ jsx("s-option", {
                  value: "",
                  children: "Todos"
                }), /* @__PURE__ */ jsx("s-option", {
                  value: "V",
                  children: "V"
                }), /* @__PURE__ */ jsx("s-option", {
                  value: "J",
                  children: "J"
                }), /* @__PURE__ */ jsx("s-option", {
                  value: "E",
                  children: "E"
                })]
              })
            }), /* @__PURE__ */ jsx("s-box", {
              inlineSize: "160px",
              children: /* @__PURE__ */ jsx("s-number-field", {
                label: "N° Documento",
                name: "document_id",
                min: 0,
                step: 1,
                inputMode: "numeric",
                value: filterState.document_id,
                onChange: (e) => {
                  var _a2;
                  return setFilterState({
                    ...filterState,
                    document_id: ((_a2 = e.target) == null ? void 0 : _a2.value) || ""
                  });
                }
              })
            }), /* @__PURE__ */ jsx("s-box", {
              inlineSize: "130px",
              children: /* @__PURE__ */ jsx("s-number-field", {
                label: "ID Crédito",
                name: "credit_id",
                min: 0,
                step: 1,
                inputMode: "numeric",
                value: filterState.credit_id,
                onChange: (e) => {
                  var _a2;
                  return setFilterState({
                    ...filterState,
                    credit_id: ((_a2 = e.target) == null ? void 0 : _a2.value) || ""
                  });
                }
              })
            }), /* @__PURE__ */ jsx("s-box", {
              inlineSize: "220px",
              children: /* @__PURE__ */ jsx("s-date-field", {
                label: "Fecha de emisión",
                value: filterState.created_at_date,
                onChange: (e) => {
                  var _a2;
                  return setFilterState({
                    ...filterState,
                    created_at_date: ((_a2 = e.target) == null ? void 0 : _a2.value) || ""
                  });
                }
              })
            }), /* @__PURE__ */ jsx("s-box", {
              inlineSize: "220px",
              children: /* @__PURE__ */ jsx("s-date-field", {
                label: "Vencimiento cuota",
                value: filterState.due_date,
                onChange: (e) => {
                  var _a2;
                  return setFilterState({
                    ...filterState,
                    due_date: ((_a2 = e.target) == null ? void 0 : _a2.value) || ""
                  });
                }
              })
            }), /* @__PURE__ */ jsx("s-box", {
              inlineSize: "140px",
              children: /* @__PURE__ */ jsxs("s-select", {
                label: "Estatus",
                value: filterState.status || "",
                onChange: (e) => {
                  var _a2;
                  return setFilterState({
                    ...filterState,
                    status: ((_a2 = e.target) == null ? void 0 : _a2.value) || ""
                  });
                },
                children: [/* @__PURE__ */ jsx("s-option", {
                  value: "",
                  children: "Todos"
                }), /* @__PURE__ */ jsx("s-option", {
                  value: "PENDIENTE_ACTIVACION",
                  children: "Pendiente"
                }), /* @__PURE__ */ jsx("s-option", {
                  value: "EMITIDO",
                  children: "Emitido"
                }), /* @__PURE__ */ jsx("s-option", {
                  value: "EN_PROGRESO",
                  children: "En Progresso"
                }), /* @__PURE__ */ jsx("s-option", {
                  value: "MOROSO",
                  children: "Moroso"
                }), /* @__PURE__ */ jsx("s-option", {
                  value: "PAGADO",
                  children: "Pagado"
                }), /* @__PURE__ */ jsx("s-option", {
                  value: "CANCELADO",
                  children: "Cancelado"
                })]
              })
            })]
          })
        }), /* @__PURE__ */ jsxs("s-stack", {
          direction: "inline",
          gap: "small-200",
          children: [/* @__PURE__ */ jsx("s-button", {
            variant: "primary",
            onClick: handleSearch,
            children: "Buscar"
          }), /* @__PURE__ */ jsx("s-button", {
            variant: "tertiary",
            tone: "neutral",
            onClick: clearSearch,
            children: "Limpiar"
          }), /* @__PURE__ */ jsx("s-button", {
            variant: "secondary",
            accessibilityLabel: "Opciones de exportación",
            commandFor: "export-popover",
            command: "--toggle",
            children: "Exportar"
          }), /* @__PURE__ */ jsx("s-popover", {
            id: "export-popover",
            children: /* @__PURE__ */ jsxs("s-stack", {
              direction: "block",
              gap: "small",
              padding: "base",
              children: [/* @__PURE__ */ jsx("s-button", {
                accessibilityLabel: "Exportar como CSV",
                variant: "tertiary",
                onClick: () => handleExport("csv"),
                children: "Exportar a CSV"
              }), /* @__PURE__ */ jsx("s-button", {
                accessibilityLabel: "Exportar como XLSX",
                variant: "tertiary",
                onClick: () => handleExport("xlsx"),
                children: "Exportar a XLSX"
              }), /* @__PURE__ */ jsx("s-button", {
                accessibilityLabel: "Exportar como PDF",
                variant: "tertiary",
                onClick: () => handleExport("pdf"),
                children: "Exportar a PDF"
              })]
            })
          })]
        })]
      }), /* @__PURE__ */ jsxs("s-table", {
        paginate: true,
        loading,
        hasNextPage,
        hasPreviousPage,
        onNextPage: () => {
          if (hasNextPage) {
            setPage((p) => p + 1);
          }
        },
        onPreviousPage: () => {
          if (hasPreviousPage) {
            setPage((p) => Math.max(1, p - 1));
          }
        },
        children: [/* @__PURE__ */ jsxs("s-table-header-row", {
          children: [/* @__PURE__ */ jsx("s-table-header", {
            listSlot: "primary",
            format: "base",
            children: /* @__PURE__ */ jsx("s-stack", {
              direction: "inline",
              justifyContent: "center",
              children: /* @__PURE__ */ jsx("s-text", {
                children: "ID"
              })
            })
          }), /* @__PURE__ */ jsx("s-table-header", {
            format: "base",
            children: /* @__PURE__ */ jsx("s-stack", {
              direction: "inline",
              justifyContent: "center",
              children: "Fecha"
            })
          }), /* @__PURE__ */ jsx("s-table-header", {
            children: /* @__PURE__ */ jsx("s-stack", {
              direction: "inline",
              justifyContent: "center",
              children: /* @__PURE__ */ jsx("s-text", {
                children: "Cliente"
              })
            })
          }), /* @__PURE__ */ jsx("s-table-header", {
            format: "base",
            children: /* @__PURE__ */ jsx("s-stack", {
              direction: "inline",
              justifyContent: "center",
              children: /* @__PURE__ */ jsx("s-text", {
                children: "Monto Crédito"
              })
            })
          }), /* @__PURE__ */ jsx("s-table-header", {
            format: "base",
            children: /* @__PURE__ */ jsx("s-stack", {
              direction: "inline",
              justifyContent: "center",
              children: /* @__PURE__ */ jsx("s-text", {
                children: "Último Abono"
              })
            })
          }), /* @__PURE__ */ jsx("s-table-header", {
            format: "base",
            children: /* @__PURE__ */ jsx("s-stack", {
              direction: "inline",
              justifyContent: "center",
              children: /* @__PURE__ */ jsx("s-text", {
                children: "Saldo Restante"
              })
            })
          }), /* @__PURE__ */ jsx("s-table-header", {
            format: "base",
            children: /* @__PURE__ */ jsx("s-stack", {
              direction: "inline",
              justifyContent: "center",
              children: /* @__PURE__ */ jsx("s-text", {
                children: "Detalle de último abono"
              })
            })
          }), /* @__PURE__ */ jsx("s-table-header", {
            format: "base",
            children: /* @__PURE__ */ jsx("s-stack", {
              direction: "inline",
              justifyContent: "center",
              children: /* @__PURE__ */ jsx("s-text", {
                children: "Observaciones de Abono"
              })
            })
          }), /* @__PURE__ */ jsx("s-table-header", {
            format: "base",
            children: /* @__PURE__ */ jsx("s-stack", {
              direction: "inline",
              justifyContent: "center",
              children: /* @__PURE__ */ jsx("s-text", {
                children: "Número de cuotas"
              })
            })
          }), /* @__PURE__ */ jsx("s-table-header", {
            format: "base",
            children: /* @__PURE__ */ jsx("s-stack", {
              direction: "inline",
              justifyContent: "center",
              children: /* @__PURE__ */ jsx("s-text", {
                children: "Estatus"
              })
            })
          }), /* @__PURE__ */ jsx("s-table-header", {
            format: "base",
            children: /* @__PURE__ */ jsx("s-stack", {
              direction: "inline",
              justifyContent: "center",
              children: /* @__PURE__ */ jsx("s-text", {
                children: "Acciones"
              })
            })
          })]
        }), /* @__PURE__ */ jsx("s-table-body", {
          children: credits.map((credit) => {
            var _a2, _b;
            return /* @__PURE__ */ jsxs("s-table-row", {
              children: [/* @__PURE__ */ jsx("s-table-cell", {
                children: /* @__PURE__ */ jsx("s-stack", {
                  direction: "inline",
                  justifyContent: "center",
                  children: credit.id
                })
              }), /* @__PURE__ */ jsx("s-table-cell", {
                children: /* @__PURE__ */ jsx("s-stack", {
                  direction: "inline",
                  justifyContent: "center",
                  children: formatDate(credit.created_at)
                })
              }), /* @__PURE__ */ jsx("s-table-cell", {
                children: /* @__PURE__ */ jsx("s-stack", {
                  direction: "inline",
                  justifyContent: "center",
                  children: /* @__PURE__ */ jsx("s-text", {
                    children: ((_a2 = credit.customer) == null ? void 0 : _a2.full_name) || "Desconocido"
                  })
                })
              }), /* @__PURE__ */ jsx("s-table-cell", {
                children: /* @__PURE__ */ jsx("s-stack", {
                  direction: "inline",
                  justifyContent: "center",
                  children: /* @__PURE__ */ jsx("s-text", {
                    fontVariantNumeric: "tabular-nums",
                    children: formatCurrency(credit.total_amount)
                  })
                })
              }), /* @__PURE__ */ jsx("s-table-cell", {
                children: /* @__PURE__ */ jsx("s-stack", {
                  direction: "inline",
                  justifyContent: "center",
                  children: /* @__PURE__ */ jsx("s-text", {
                    fontVariantNumeric: "tabular-nums",
                    children: credit.last_payment_amount ? formatCurrency(credit.last_payment_amount) : "—"
                  })
                })
              }), /* @__PURE__ */ jsx("s-table-cell", {
                children: /* @__PURE__ */ jsx("s-stack", {
                  direction: "inline",
                  justifyContent: "center",
                  children: /* @__PURE__ */ jsx("s-text", {
                    fontVariantNumeric: "tabular-nums",
                    children: formatCurrency(credit.balance)
                  })
                })
              }), /* @__PURE__ */ jsx("s-table-cell", {
                alignment: "center",
                children: /* @__PURE__ */ jsxs("s-stack", {
                  direction: "block",
                  alignItems: "center",
                  gap: "none",
                  children: [credit.last_payment_date && /* @__PURE__ */ jsx("s-text", {
                    color: "subdued",
                    alignment: "center",
                    children: formatDate(credit.last_payment_date)
                  }), credit.last_payment_reference && /* @__PURE__ */ jsxs("s-text", {
                    color: "subdued",
                    fontVariantNumeric: "tabular-nums",
                    alignment: "center",
                    children: ["Ref:", " ", ((_b = credit.last_payment_reference) == null ? void 0 : _b.startsWith("INTENT-")) ? `RECORDATORIO-${credit.last_payment_reference.split("-")[1]}-ENVIADO` : credit.last_payment_reference]
                  }), credit.last_payment_method && /* @__PURE__ */ jsx("s-text", {
                    color: "subdued",
                    alignment: "center",
                    children: credit.last_payment_method === "BANK" ? "Transf. Bancaria" : credit.last_payment_method === "PAGO_MOVIL" ? "Pago Móvil" : credit.last_payment_method === "PAYPAL" ? "PayPal" : credit.last_payment_method === "CASH" ? "Efectivo USD" : credit.last_payment_method === "EFECTIVO" ? "Efectivo VEF" : credit.last_payment_method
                  }), !credit.last_payment_date && !credit.last_payment_method && /* @__PURE__ */ jsx("s-text", {
                    color: "subdued",
                    alignment: "center",
                    children: "—"
                  })]
                })
              }), /* @__PURE__ */ jsx("s-table-cell", {
                children: /* @__PURE__ */ jsx("s-stack", {
                  direction: "inline",
                  justifyContent: "center",
                  children: /* @__PURE__ */ jsx("s-text", {
                    children: formatNotes(credit.last_payment_notes)
                  })
                })
              }), /* @__PURE__ */ jsx("s-table-cell", {
                children: /* @__PURE__ */ jsx("s-stack", {
                  direction: "inline",
                  justifyContent: "center",
                  children: /* @__PURE__ */ jsx("s-text", {
                    fontVariantNumeric: "tabular-nums",
                    children: credit.installments_count
                  })
                })
              }), /* @__PURE__ */ jsx("s-table-cell", {
                children: /* @__PURE__ */ jsx("s-stack", {
                  direction: "inline",
                  justifyContent: "center",
                  children: /* @__PURE__ */ jsx("s-badge", {
                    tone: credit.status === "EMITIDO" ? "neutral" : credit.status === "PENDIENTE_ACTIVACION" ? "warning" : credit.status === "EN_PROGRESO" ? "info" : credit.status === "PAGADO" ? "success" : credit.status === "CANCELADO" ? "critical" : "info",
                    children: credit.status
                  })
                })
              }), /* @__PURE__ */ jsx("s-table-cell", {
                children: /* @__PURE__ */ jsxs("s-stack", {
                  gap: "small",
                  children: [/* @__PURE__ */ jsx("s-button-group", {
                    children: /* @__PURE__ */ jsx("s-button", {
                      slot: "secondary-actions",
                      icon: "view",
                      href: `/app/credit_detail/${credit.id}`,
                      accessibilityLabel: "Ver información detallada de este crédito",
                      children: "Detalles"
                    })
                  }), /* @__PURE__ */ jsx("s-button-group", {
                    children: /* @__PURE__ */ jsx("s-button", {
                      slot: "secondary-actions",
                      icon: "payment",
                      href: `/app/payments?creditId=${credit.id}`,
                      accessibilityLabel: "Ver pagos de este crédito",
                      children: "Pagos"
                    })
                  }), /* @__PURE__ */ jsx("s-button-group", {
                    children: /* @__PURE__ */ jsx("s-button", {
                      slot: "secondary-actions",
                      variant: "secondary",
                      tone: "critical",
                      icon: "x-circle",
                      disabled: credit.status === "CANCELADO" || credit.status === "PAGADO",
                      onClick: (event) => handleCancel(credit.id, event),
                      accessibilityLabel: "Cancelar este crédito y anular cuotas pendientes",
                      children: "Cancelar"
                    })
                  }), /* @__PURE__ */ jsx("s-button-group", {
                    children: /* @__PURE__ */ jsx("s-button", {
                      slot: "secondary-actions",
                      variant: "secondary",
                      tone: "critical",
                      icon: "delete",
                      onClick: () => handleDelete(credit.id),
                      accessibilityLabel: "Eliminar permanentemente este registro de crédito",
                      children: "Eliminar"
                    })
                  })]
                })
              })]
            }, credit.id);
          })
        })]
      })]
    }), /* @__PURE__ */ jsx("s-divider", {}), /* @__PURE__ */ jsxs("s-stack", {
      padding: "base",
      alignItems: "center",
      gap: "base",
      children: [/* @__PURE__ */ jsx("s-text", {
        color: "subdued",
        children: "Desarrollado por Opentech LCC"
      }), /* @__PURE__ */ jsxs("s-text", {
        children: ["¿Tienes alguna duda?", " ", /* @__PURE__ */ jsx("s-link", {
          href: "https://lccopen.tech/contact",
          target: "_blank",
          children: "Contáctanos"
        }), "."]
      })]
    })]
  });
});
const route16 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action,
  default: app_credits,
  headers: headers$1,
  loader: loader$1
}, Symbol.toStringTag, { value: "Module" }));
const loader = async ({
  request
}) => {
  const {
    session
  } = await authenticate.admin(request);
  let dashboardData = null;
  const BACKEND_URL2 = process.env.BACKEND_URL || "http://localhost:8000";
  try {
    let accessToken = await getAccessTokenForShop(session.shop);
    if (accessToken) {
      const dashRes = await fetch(`${BACKEND_URL2}/api/dashboard`, {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });
      if (dashRes.ok) {
        dashboardData = await dashRes.json();
        fetch(`${BACKEND_URL2}/api/audit/login`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        }).catch((ignored) => {
        });
      } else {
        console.error("[Home Loader] Dashboard API error:", dashRes.status);
      }
    } else {
      console.error("[Home Loader] Critical: Could not retrieve an access token for Home.");
    }
  } catch (err) {
    console.error("[Home Loader] Fetch exception:", err);
  }
  return {
    dashboardData
  };
};
const headers = () => ({
  "Cache-Control": "no-cache, no-store, must-revalidate"
});
const app__index = UNSAFE_withComponentProps(function Home() {
  var _a2, _b, _c, _d, _e, _f, _g, _h;
  const {
    dashboardData
  } = useLoaderData();
  const [showManual, setShowManual] = useState(false);
  const totalDebt = ((_a2 = dashboardData == null ? void 0 : dashboardData.amounts) == null ? void 0 : _a2.total_pending) || 0;
  ((_b = dashboardData == null ? void 0 : dashboardData.customers) == null ? void 0 : _b.clients_with_debt) || 0;
  const customers = (dashboardData == null ? void 0 : dashboardData.customers_summary) || [];
  const totalPendingOrders = customers.reduce((sum, c) => sum + c.pendingOrders, 0);
  const totalBalance = customers.reduce((sum, c) => sum + c.balance, 0);
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD"
    }).format(amount);
  };
  return /* @__PURE__ */ jsx("s-page", {
    heading: "FÍAME - App",
    children: /* @__PURE__ */ jsxs("s-stack", {
      gap: "base",
      children: [/* @__PURE__ */ jsx("s-box", {
        paddingBlockEnd: "none",
        children: /* @__PURE__ */ jsx("s-button", {
          icon: "info",
          onClick: () => setShowManual((prev) => !prev),
          tone: "auto",
          children: showManual ? "Ocultar Manual de Uso" : "Mostrar Manual de Uso"
        })
      }), showManual && /* @__PURE__ */ jsxs("s-section", {
        padding: "base",
        accessibilityLabel: "Manual de Usuario",
        children: [/* @__PURE__ */ jsx("s-heading", {
          children: "Guía Rápida de la Aplicación"
        }), /* @__PURE__ */ jsxs("s-grid", {
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: "base",
          children: [/* @__PURE__ */ jsxs("s-box", {
            children: [/* @__PURE__ */ jsx("s-text", {
              type: "strong",
              children: "CREAR UN CRÉDITO: PRIMEROS PASOS"
            }), /* @__PURE__ */ jsxs("s-unordered-list", {
              children: [/* @__PURE__ */ jsx("s-list-item", {
                children: '1. Ve a "Registrar Crédito". Selecciona uno de los clientes registrados en tu comercio de Shopify y empieza una nueva operación crediticia.'
              }), /* @__PURE__ */ jsx("s-list-item", {
                children: "2. En la tabla inferior de productos, selecciona los que el cliente desea. "
              }), /* @__PURE__ */ jsx("s-list-item", {
                children: "3. Selecciona la periodicidad: Mensual, quincenal oi fiado, y planifica los pago en múltiples cuotas si es necesario."
              }), /* @__PURE__ */ jsx("s-list-item", {
                children: "4. Verifica que toda la información sea la correcta, y finaliza la creación del crédito."
              })]
            })]
          }), /* @__PURE__ */ jsxs("s-box", {
            children: [/* @__PURE__ */ jsx("s-text", {
              type: "strong",
              children: "REGISTRAR PAGOS: FORMA DIRECTA"
            }), /* @__PURE__ */ jsxs("s-unordered-list", {
              children: [/* @__PURE__ */ jsx("s-list-item", {
                children: '1- Ve a "Registrar Pago". Selecciona el clientes.'
              }), /* @__PURE__ */ jsx("s-list-item", {
                children: "2. Selecciona el método de pago, la cantidad en divisas y el código de referencia asociado al pago del cliente."
              }), /* @__PURE__ */ jsx("s-list-item", {
                children: "3. En la parte inferior, selecciona las cuotas que el cliente desea pagar."
              }), /* @__PURE__ */ jsx("s-list-item", {
                children: "IMPORTANTE: Este método se usa en caso de que el clinete pague de forma directa sin usar el recordatorio por e-mail."
              })]
            })]
          }), /* @__PURE__ */ jsxs("s-box", {
            children: [/* @__PURE__ */ jsx("s-text", {
              type: "strong",
              children: "REGISTRAR PAGOS: USANDO EL RECORDATORIO POR E.MAIL"
            }), /* @__PURE__ */ jsxs("s-unordered-list", {
              children: [/* @__PURE__ */ jsx("s-list-item", {
                children: '1- Ve a "Pagos Esperados" o a "Detalles de Crédito". Oprime el botón de "Enviar Recordatorio". '
              }), /* @__PURE__ */ jsx("s-list-item", {
                children: "2. El cliente recibirá un e-mail con un link de pago. Deberá seleccionar el método de pago preferido, y llenar un formulario con la información de su pago. "
              }), /* @__PURE__ */ jsx("s-list-item", {
                children: "3. Al completar el formulario, la información del pago llegará automáticamente a la app en Shopify."
              }), /* @__PURE__ */ jsx("s-list-item", {
                children: '4. Contrasta la información del formulario con los estados financieros del comercio. Finalmente desde "Pagos", aprueba o rechaza el pago.'
              })]
            })]
          }), /* @__PURE__ */ jsxs("s-box", {
            children: [/* @__PURE__ */ jsx("s-text", {
              type: "strong",
              children: "CONFIGURANDO LA INFORMACIÓN DE PAGO"
            }), /* @__PURE__ */ jsx("s-paragraph", {
              color: "subdued",
              children: 'Desde "Configuración", edita los datos de los métodos de pago y los datos a los cuales los clientes realizarán los pagos.'
            }), /* @__PURE__ */ jsx("s-paragraph", {
              color: "subdued",
              children: "Se aceptan:"
            }), /* @__PURE__ */ jsxs("s-unordered-list", {
              children: [/* @__PURE__ */ jsx("s-list-item", {
                children: "Pago Movil (Bancos venezolanos)"
              }), /* @__PURE__ */ jsx("s-list-item", {
                children: "Transferencia Bancaria (Bancos venezolanos)"
              }), /* @__PURE__ */ jsx("s-list-item", {
                children: "Zinli"
              }), /* @__PURE__ */ jsx("s-list-item", {
                children: "Zelle"
              }), /* @__PURE__ */ jsx("s-list-item", {
                children: "Binance/USDT"
              }), /* @__PURE__ */ jsx("s-list-item", {
                children: "Débito (POS)"
              })]
            })]
          }), /* @__PURE__ */ jsxs("s-box", {
            children: [/* @__PURE__ */ jsx("s-text", {
              type: "strong",
              children: "MONITOREO DE CRÉDITOS"
            }), /* @__PURE__ */ jsx("s-paragraph", {
              color: "subdued",
              children: 'Desde "Créditos", "Pagos", "Pagos Esperados" y las páginas de "Detalles de Crédito" y "Detalles de Pago" se puede monitorear los estatus de cada operación crediticia activa.'
            }), /* @__PURE__ */ jsx("s-paragraph", {
              color: "subdued",
              children: "La reputación crediticia de cada cliente se actualizará automáticamente dependiendo del promedio de créditos y pagos completados por cada cliente."
            })]
          })]
        })]
      }), /* @__PURE__ */ jsxs("s-grid", {
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: "small",
        padding: "base",
        children: [/* @__PURE__ */ jsx("s-grid-item", {
          gridColumn: "span 1",
          children: /* @__PURE__ */ jsx("s-section", {
            children: /* @__PURE__ */ jsxs("s-stack", {
              alignItems: "center",
              gap: "small-200",
              children: [/* @__PURE__ */ jsx("s-text", {
                color: "subdued",
                children: "Créditos Activos"
              }), /* @__PURE__ */ jsx("s-heading", {
                children: ((_c = dashboardData == null ? void 0 : dashboardData.credits) == null ? void 0 : _c.active) ?? 0
              })]
            })
          })
        }), /* @__PURE__ */ jsx("s-grid-item", {
          gridColumn: "span 1",
          children: /* @__PURE__ */ jsx("s-section", {
            children: /* @__PURE__ */ jsxs("s-stack", {
              alignItems: "center",
              gap: "small-200",
              children: [/* @__PURE__ */ jsx("s-text", {
                color: "subdued",
                children: "Créditos Finalizados"
              }), /* @__PURE__ */ jsx("s-heading", {
                children: ((_d = dashboardData == null ? void 0 : dashboardData.credits) == null ? void 0 : _d.total) != null ? dashboardData.credits.total - (((_e = dashboardData == null ? void 0 : dashboardData.credits) == null ? void 0 : _e.active) ?? 0) - (((_f = dashboardData == null ? void 0 : dashboardData.credits) == null ? void 0 : _f.morose) ?? 0) : 0
              })]
            })
          })
        }), /* @__PURE__ */ jsx("s-grid-item", {
          gridColumn: "span 1",
          children: /* @__PURE__ */ jsx("s-section", {
            children: /* @__PURE__ */ jsxs("s-stack", {
              alignItems: "center",
              gap: "small-200",
              children: [/* @__PURE__ */ jsx("s-text", {
                color: "subdued",
                children: "Pagos Esperados"
              }), /* @__PURE__ */ jsx("s-heading", {
                children: ((_g = dashboardData == null ? void 0 : dashboardData.payments) == null ? void 0 : _g.pending_review) ?? 0
              })]
            })
          })
        }), /* @__PURE__ */ jsx("s-grid-item", {
          gridColumn: "span 1",
          children: /* @__PURE__ */ jsx("s-section", {
            children: /* @__PURE__ */ jsxs("s-stack", {
              alignItems: "center",
              gap: "small-200",
              children: [/* @__PURE__ */ jsx("s-text", {
                color: "subdued",
                children: "Pagos No Completados"
              }), /* @__PURE__ */ jsx("s-heading", {
                children: ((_h = dashboardData == null ? void 0 : dashboardData.payments) == null ? void 0 : _h.not_paid) ?? 0
              })]
            })
          })
        })]
      }), /* @__PURE__ */ jsx("s-section", {
        padding: "base",
        accessibilityLabel: "Lista de Clientes",
        children: /* @__PURE__ */ jsxs("s-table", {
          children: [/* @__PURE__ */ jsxs("s-table-header-row", {
            children: [/* @__PURE__ */ jsx("s-table-header", {
              listSlot: "primary",
              children: "Cliente"
            }), /* @__PURE__ */ jsx("s-table-header", {
              format: "numeric",
              children: "Ordenes Pendientes"
            }), /* @__PURE__ */ jsx("s-table-header", {
              format: "numeric",
              children: "Deuda Pendiente"
            }), /* @__PURE__ */ jsx("s-table-header", {
              format: "numeric",
              children: "Saldo a favor"
            }), /* @__PURE__ */ jsx("s-table-header", {
              listSlot: "secondary",
              children: "Detalles"
            })]
          }), /* @__PURE__ */ jsxs("s-table-body", {
            children: [/* @__PURE__ */ jsxs("s-table-row", {
              children: [/* @__PURE__ */ jsx("s-table-cell", {
                children: /* @__PURE__ */ jsx("s-text", {
                  "font-weight": "bold",
                  children: "Totales"
                })
              }), /* @__PURE__ */ jsx("s-table-cell", {
                children: /* @__PURE__ */ jsx("s-text", {
                  "font-weight": "bold",
                  children: totalPendingOrders
                })
              }), /* @__PURE__ */ jsx("s-table-cell", {
                children: /* @__PURE__ */ jsx("s-text", {
                  "font-weight": "bold",
                  children: formatCurrency(totalDebt)
                })
              }), /* @__PURE__ */ jsx("s-table-cell", {
                children: /* @__PURE__ */ jsx("s-text", {
                  "font-weight": "bold",
                  children: formatCurrency(totalBalance)
                })
              }), /* @__PURE__ */ jsx("s-table-cell", {})]
            }), customers.length > 0 ? customers.map((customer, index2) => /* @__PURE__ */ jsxs("s-table-row", {
              children: [/* @__PURE__ */ jsx("s-table-cell", {
                children: /* @__PURE__ */ jsx("s-text", {
                  children: customer.name
                })
              }), /* @__PURE__ */ jsx("s-table-cell", {
                children: customer.pendingOrders
              }), /* @__PURE__ */ jsx("s-table-cell", {
                children: formatCurrency(customer.pendingDebt)
              }), /* @__PURE__ */ jsx("s-table-cell", {
                children: formatCurrency(customer.balance)
              }), /* @__PURE__ */ jsx("s-table-cell", {
                children: /* @__PURE__ */ jsx("s-link", {
                  href: `/app/customer_detail?name=${encodeURIComponent(customer.name)}`,
                  children: /* @__PURE__ */ jsx("s-text", {
                    color: "subdued",
                    children: "Ver órdenes"
                  })
                })
              })]
            }, customer.id || index2)) : /* @__PURE__ */ jsxs("s-table-row", {
              children: [/* @__PURE__ */ jsx("s-table-cell", {
                children: "No hay clientes con deudas activas o saldos a favor en este momento."
              }), /* @__PURE__ */ jsx("s-table-cell", {}), /* @__PURE__ */ jsx("s-table-cell", {}), /* @__PURE__ */ jsx("s-table-cell", {}), /* @__PURE__ */ jsx("s-table-cell", {})]
            })]
          })]
        })
      }), /* @__PURE__ */ jsxs("s-stack", {
        padding: "base",
        alignItems: "center",
        children: [/* @__PURE__ */ jsx("s-text", {
          color: "subdued",
          children: "Desarrollado por Opentech LCC"
        }), /* @__PURE__ */ jsxs("s-text", {
          children: ["¿Tienes alguna duda?", " ", /* @__PURE__ */ jsx("s-link", {
            href: "https://lccopen.tech/contact",
            target: "_blank",
            children: "Contáctanos"
          }), "."]
        })]
      })]
    })
  });
});
const route17 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: app__index,
  headers,
  loader
}, Symbol.toStringTag, { value: "Module" }));
const serverManifest = { "entry": { "module": "/assets/entry.client-BcxiKxJm.js", "imports": ["/assets/chunk-QFMPRPBF-CyI6lhZy.js"], "css": [] }, "routes": { "root": { "id": "root", "parentId": void 0, "path": "", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": true, "hasErrorBoundary": false, "module": "/assets/root-V8JPWLZ5.js", "imports": ["/assets/chunk-QFMPRPBF-CyI6lhZy.js"], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/auth.login": { "id": "routes/auth.login", "parentId": "root", "path": "auth/login", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": true, "hasErrorBoundary": false, "module": "/assets/route-B5L1paog.js", "imports": ["/assets/chunk-QFMPRPBF-CyI6lhZy.js", "/assets/AppProxyProvider-ClfaIOZi.js"], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/auth.$": { "id": "routes/auth.$", "parentId": "root", "path": "auth/*", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": false, "hasErrorBoundary": false, "module": "/assets/auth._-l0sNRNKZ.js", "imports": [], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/_index": { "id": "routes/_index", "parentId": "root", "path": void 0, "index": true, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": true, "hasErrorBoundary": false, "module": "/assets/route-CoCfKmWl.js", "imports": ["/assets/chunk-QFMPRPBF-CyI6lhZy.js"], "css": ["/assets/route-CNPfFM0M.css"], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/pago": { "id": "routes/pago", "parentId": "root", "path": "pago", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": true, "hasErrorBoundary": false, "module": "/assets/pago-BAYRmojJ.js", "imports": ["/assets/chunk-QFMPRPBF-CyI6lhZy.js"], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/app": { "id": "routes/app", "parentId": "root", "path": "app", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": true, "hasErrorBoundary": true, "module": "/assets/app-9lMhMQCk.js", "imports": ["/assets/chunk-QFMPRPBF-CyI6lhZy.js", "/assets/AppProxyProvider-ClfaIOZi.js"], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/app.customer_detail.$id": { "id": "routes/app.customer_detail.$id", "parentId": "routes/app", "path": "customer_detail/:id", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": true, "hasErrorBoundary": false, "module": "/assets/app.customer_detail._id-DHLrqvOI.js", "imports": ["/assets/chunk-QFMPRPBF-CyI6lhZy.js", "/assets/jspdf.plugin.autotable-BVx8vpHF.js", "/assets/ClientDate-BvIsM1Tn.js"], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/app.payment_detail.$id": { "id": "routes/app.payment_detail.$id", "parentId": "routes/app", "path": "payment_detail/:id", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": true, "hasErrorBoundary": true, "module": "/assets/app.payment_detail._id-BXaeO23e.js", "imports": ["/assets/chunk-QFMPRPBF-CyI6lhZy.js", "/assets/jspdf.plugin.autotable-BVx8vpHF.js", "/assets/ClientDate-BvIsM1Tn.js"], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/app.credit_detail.$id": { "id": "routes/app.credit_detail.$id", "parentId": "routes/app", "path": "credit_detail/:id", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": true, "hasErrorBoundary": false, "module": "/assets/app.credit_detail._id-BFcYlf_c.js", "imports": ["/assets/chunk-QFMPRPBF-CyI6lhZy.js", "/assets/jspdf.plugin.autotable-BVx8vpHF.js", "/assets/ClientDate-BvIsM1Tn.js"], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/app.expected_payments": { "id": "routes/app.expected_payments", "parentId": "routes/app", "path": "expected_payments", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": true, "hasErrorBoundary": true, "module": "/assets/app.expected_payments-DU2y08rE.js", "imports": ["/assets/chunk-QFMPRPBF-CyI6lhZy.js", "/assets/ClientDate-BvIsM1Tn.js"], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/app.shopify_customers": { "id": "routes/app.shopify_customers", "parentId": "routes/app", "path": "shopify_customers", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": true, "hasErrorBoundary": false, "module": "/assets/app.shopify_customers-DfECg8Tq.js", "imports": ["/assets/chunk-QFMPRPBF-CyI6lhZy.js"], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/app.registre_payment": { "id": "routes/app.registre_payment", "parentId": "routes/app", "path": "registre_payment", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": true, "hasErrorBoundary": false, "module": "/assets/app.registre_payment-DgPy-abZ.js", "imports": ["/assets/chunk-QFMPRPBF-CyI6lhZy.js"], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/app.registre_credit": { "id": "routes/app.registre_credit", "parentId": "routes/app", "path": "registre_credit", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": true, "hasErrorBoundary": false, "module": "/assets/app.registre_credit-tUC0EqbB.js", "imports": ["/assets/chunk-QFMPRPBF-CyI6lhZy.js"], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/app.notifications": { "id": "routes/app.notifications", "parentId": "routes/app", "path": "notifications", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": false, "hasErrorBoundary": false, "module": "/assets/app.notifications-l0sNRNKZ.js", "imports": [], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/app.payments": { "id": "routes/app.payments", "parentId": "routes/app", "path": "payments", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": true, "hasErrorBoundary": false, "module": "/assets/app.payments-CFyFqUR6.js", "imports": ["/assets/chunk-QFMPRPBF-CyI6lhZy.js", "/assets/jspdf.plugin.autotable-BVx8vpHF.js", "/assets/ClientDate-BvIsM1Tn.js"], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/app.settings": { "id": "routes/app.settings", "parentId": "routes/app", "path": "settings", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": true, "hasErrorBoundary": false, "module": "/assets/app.settings-Dspt6CZU.js", "imports": ["/assets/chunk-QFMPRPBF-CyI6lhZy.js"], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/app.credits": { "id": "routes/app.credits", "parentId": "routes/app", "path": "credits", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": true, "hasErrorBoundary": false, "module": "/assets/app.credits-KAnF1jfl.js", "imports": ["/assets/chunk-QFMPRPBF-CyI6lhZy.js", "/assets/jspdf.plugin.autotable-BVx8vpHF.js"], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/app._index": { "id": "routes/app._index", "parentId": "routes/app", "path": void 0, "index": true, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": true, "hasErrorBoundary": false, "module": "/assets/app._index-VPWlMW0S.js", "imports": ["/assets/chunk-QFMPRPBF-CyI6lhZy.js"], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 } }, "url": "/assets/manifest-342039d7.js", "version": "342039d7", "sri": void 0 };
const assetsBuildDirectory = "build\\client";
const basename = "/";
const future = { "unstable_optimizeDeps": false, "unstable_passThroughRequests": false, "unstable_subResourceIntegrity": false, "unstable_trailingSlashAwareDataRequests": false, "unstable_previewServerPrerendering": false, "v8_middleware": false, "v8_splitRouteModules": false, "v8_viteEnvironmentApi": false };
const ssr = true;
const isSpaMode = false;
const prerender = [];
const routeDiscovery = { "mode": "lazy", "manifestPath": "/__manifest" };
const publicPath = "/";
const entry = { module: entryServer };
const routes = {
  "root": {
    id: "root",
    parentId: void 0,
    path: "",
    index: void 0,
    caseSensitive: void 0,
    module: route0
  },
  "routes/auth.login": {
    id: "routes/auth.login",
    parentId: "root",
    path: "auth/login",
    index: void 0,
    caseSensitive: void 0,
    module: route1
  },
  "routes/auth.$": {
    id: "routes/auth.$",
    parentId: "root",
    path: "auth/*",
    index: void 0,
    caseSensitive: void 0,
    module: route2
  },
  "routes/_index": {
    id: "routes/_index",
    parentId: "root",
    path: void 0,
    index: true,
    caseSensitive: void 0,
    module: route3
  },
  "routes/pago": {
    id: "routes/pago",
    parentId: "root",
    path: "pago",
    index: void 0,
    caseSensitive: void 0,
    module: route4
  },
  "routes/app": {
    id: "routes/app",
    parentId: "root",
    path: "app",
    index: void 0,
    caseSensitive: void 0,
    module: route5
  },
  "routes/app.customer_detail.$id": {
    id: "routes/app.customer_detail.$id",
    parentId: "routes/app",
    path: "customer_detail/:id",
    index: void 0,
    caseSensitive: void 0,
    module: route6
  },
  "routes/app.payment_detail.$id": {
    id: "routes/app.payment_detail.$id",
    parentId: "routes/app",
    path: "payment_detail/:id",
    index: void 0,
    caseSensitive: void 0,
    module: route7
  },
  "routes/app.credit_detail.$id": {
    id: "routes/app.credit_detail.$id",
    parentId: "routes/app",
    path: "credit_detail/:id",
    index: void 0,
    caseSensitive: void 0,
    module: route8
  },
  "routes/app.expected_payments": {
    id: "routes/app.expected_payments",
    parentId: "routes/app",
    path: "expected_payments",
    index: void 0,
    caseSensitive: void 0,
    module: route9
  },
  "routes/app.shopify_customers": {
    id: "routes/app.shopify_customers",
    parentId: "routes/app",
    path: "shopify_customers",
    index: void 0,
    caseSensitive: void 0,
    module: route10
  },
  "routes/app.registre_payment": {
    id: "routes/app.registre_payment",
    parentId: "routes/app",
    path: "registre_payment",
    index: void 0,
    caseSensitive: void 0,
    module: route11
  },
  "routes/app.registre_credit": {
    id: "routes/app.registre_credit",
    parentId: "routes/app",
    path: "registre_credit",
    index: void 0,
    caseSensitive: void 0,
    module: route12
  },
  "routes/app.notifications": {
    id: "routes/app.notifications",
    parentId: "routes/app",
    path: "notifications",
    index: void 0,
    caseSensitive: void 0,
    module: route13
  },
  "routes/app.payments": {
    id: "routes/app.payments",
    parentId: "routes/app",
    path: "payments",
    index: void 0,
    caseSensitive: void 0,
    module: route14
  },
  "routes/app.settings": {
    id: "routes/app.settings",
    parentId: "routes/app",
    path: "settings",
    index: void 0,
    caseSensitive: void 0,
    module: route15
  },
  "routes/app.credits": {
    id: "routes/app.credits",
    parentId: "routes/app",
    path: "credits",
    index: void 0,
    caseSensitive: void 0,
    module: route16
  },
  "routes/app._index": {
    id: "routes/app._index",
    parentId: "routes/app",
    path: void 0,
    index: true,
    caseSensitive: void 0,
    module: route17
  }
};
const allowedActionOrigins = false;
export {
  allowedActionOrigins,
  serverManifest as assets,
  assetsBuildDirectory,
  basename,
  entry,
  future,
  isSpaMode,
  prerender,
  publicPath,
  routeDiscovery,
  routes,
  ssr
};
