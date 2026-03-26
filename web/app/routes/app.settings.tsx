import { useState, useEffect } from 'react';
import { type LoaderFunctionArgs, type ActionFunctionArgs } from "react-router";
import { useLoaderData, useSubmit, useNavigation, useActionData } from "react-router";
import { getAccessTokenForShop } from "../lib/auth.server";
import { authenticate } from "../shopify.server";
import {Page} from "@shopify/polaris"

const VENEZUELAN_BANKS = [
  "(0001) BANCO CENTRAL DE VENEZUELA",
  "(0102) BANCO DE VENEZUELA, S.A. BANCO UNIVERSAL",
  "(0104) BANCO VENEZOLANO DE CRÉDITO, S.A BANCO UNIVERSAL",
  "(0105) BANCO MERCANTIL C.A., BANCO UNIVERSAL",
  "(0108) BANCO PROVINCIAL, S.A. BANCO UNIVERSAL",
  "(0114) BANCO DEL CARIBE C.A., BANCO UNIVERSAL",
  "(0115) BANCO EXTERIOR C.A., BANCO UNIVERSAL",
  "(0128) BANCO CARONÍ C.A., BANCO UNIVERSAL",
  "(0134) BANESCO BANCO UNIVERSAL, C.A.",
  "(0137) BANCO SOFITASA BANCO UNIVERSAL, C.A .",
  "(0138) BANCO PLAZA, BANCO UNIVERSAL",
  "(0146) BANCO DE LA GENTE EMPRENDEDORA C.A.",
  "(0151) BANCO FONDO COMÚN, C.A BANCO UNIVERSAL",
  "(0156) 100% BANCO, BANCO COMERCIAL, C.A",
  "(0157) DELSUR, BANCO UNIVERSAL C.A.",
  "(0163) BANCO DEL TESORO C.A., BANCO UNIVERSAL",
  "(0166) BANCO AGRÍCOLA DE VENEZUELA C.A., BANCO UNIVERSAL",
  "(0168) BANCRECER S.A., BANCO MICROFINANCIERO",
  "(0169) R4, BANCO MICROFINANCIERO, C.A.",
  "(0171) BANCO ACTIVO C.A., BANCO UNIVERSAL",
  "(0172) BANCAMIGA BANCO UNIVERSAL, C.A.",
  "(0173) BANCO INTERNACIONAL DE DESARROLLO C.A., BANCO UNIVERSAL",
  "(0174) BANPLUS BANCO UNIVERSAL, C.A.",
  "(0175) BANCO DIGITAL DE LOS TRABAJADORES, BANCO UNIVERSAL C.A.",
  "(0177) BANCO DE LA FUERZA ARMADA NACIONAL BOLIVARIANA, B.U.",
  "(0178) N58 BANCO DIGITAL, BANCO MICROFINANCIERO",
  "(0191) BANCO NACIONAL DE CRÉDITO C.A., BANCO UNIVERSAL",
  "(0601) INSTITUTO MUNICIPAL DE CRÉDITO POPULAR",
];

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

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const accessToken = await getAccessTokenForShop(session.shop);
  if (!accessToken) throw new Error("Token no disponible");

  const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";
  const res = await fetch(`${BACKEND_URL}/api/merchants/settings`, {
    headers: { "Authorization": `Bearer ${accessToken}` }
  });
  if (!res.ok) throw new Error("Error cargando settings");
  const data = await res.json();
  return { settings: data };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const accessToken = await getAccessTokenForShop(session.shop);
  const formData = await request.formData();
  
  const pagoMovil = JSON.parse(formData.get("pagoMovil") as string);
  const transferencia = JSON.parse(formData.get("transferencia") as string);

  const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";
  const res = await fetch(`${BACKEND_URL}/api/merchants/settings`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${accessToken}`
    },
    body: JSON.stringify({ pago_movil: pagoMovil, transferencia })
  });
  
  if (!res.ok) return { success: false };
  return { success: true };
};

export const headers = () => ({
  "Cache-Control": "no-cache, no-store, must-revalidate",
});

export default function Settings() {
  const { settings } = useLoaderData<typeof loader>();
  const submit = useSubmit();
  const navigation = useNavigation();
  const actionData = useActionData<{ success?: boolean }>();

  const [pagoMovil, setPagoMovil] = useState(settings?.pago_movil ? { ...DEFAULT_PAGO_MOVIL, ...settings.pago_movil } : DEFAULT_PAGO_MOVIL);
  const [transferencia, setTransferencia] = useState(settings?.transferencia ? { ...DEFAULT_TRANSFERENCIA, ...settings.transferencia } : DEFAULT_TRANSFERENCIA);
  const [paypal, setPaypal] = useState({ email: "", titular: "" });
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  useEffect(() => {
    if (navigation.state === "submitting") {
      setSaveStatus("saving");
    } else if (navigation.state === "idle" && actionData !== undefined) {
      setSaveStatus(actionData.success ? "saved" : "error");
      const timer = setTimeout(() => setSaveStatus("idle"), 3000);
      return () => clearTimeout(timer);
    }
  }, [navigation.state, actionData]);

  const handleSave = () => {
    submit(
      { 
        pagoMovil: JSON.stringify(pagoMovil), 
        transferencia: JSON.stringify(transferencia) 
      }, 
      { method: "post" }
    );
  };

  return(
    <Page>
      <s-section heading="Métodos de Pago">
          <s-grid
            gridTemplateColumns="repeat(3, 1fr)"
            gap="base"
            padding="base"
          >
            <s-grid-item>
              <s-box border="base" borderRadius="base" padding="base">
                <s-stack gap="base">
                  <s-heading>Pago Móvil</s-heading>
                  <s-divider />
                  <s-select
                    label="Banco"
                    value={pagoMovil.banco}
                    onChange={(e: any) => setPagoMovil({...pagoMovil, banco: e.target.value})}
                  >
                    {VENEZUELAN_BANKS.map(bank => (
                      <s-option key={bank} value={bank}>{bank}</s-option>
                    ))}
                  </s-select>
                  <s-text-field
                    label="Teléfono"
                    value={pagoMovil.telefono}
                    onChange={(e: any) => setPagoMovil({...pagoMovil, telefono: e.target.value})}
                  />
                  <s-grid gridTemplateColumns="1fr 3fr" gap="small" alignItems="end">
                    <s-select
                      label="Tipo"
                      value={pagoMovil.tipoCi}
                      onChange={(e: any) => setPagoMovil({...pagoMovil, tipoCi: e.target.value})}
                    >
                      <s-option value="V">V</s-option>
                      <s-option value="J">J</s-option>
                      <s-option value="E">E</s-option>
                    </s-select>
                    <s-text-field
                      label="Documento de Identidad"
                      value={pagoMovil.ci}
                      onChange={(e: any) => setPagoMovil({...pagoMovil, ci: e.target.value})}
                    />
                  </s-grid>
                </s-stack>
              </s-box>
            </s-grid-item>

            <s-grid-item>
              <s-box border="base" borderRadius="base" padding="base">
                <s-stack gap="base">
                  <s-heading>Transferencia Bancaria</s-heading>
                  <s-divider />
                  <s-select
                    label="Banco"
                    value={transferencia.banco}
                    onChange={(e: any) => setTransferencia({...transferencia, banco: e.target.value})}
                  >
                    {VENEZUELAN_BANKS.map(bank => (
                      <s-option key={bank} value={bank}>{bank}</s-option>
                    ))}
                  </s-select>
                  <s-text-field
                    label="Número de Cuenta"
                    value={transferencia.numero}
                    onChange={(e: any) => setTransferencia({...transferencia, numero: e.target.value})}
                  />
                  <s-grid gridTemplateColumns="1fr 3fr" gap="small" alignItems="end">
                    <s-select
                      label="Tipo"
                      value={transferencia.tipoCi}
                      onChange={(e: any) => setTransferencia({...transferencia, tipoCi: e.target.value})}
                    >
                      <s-option value="V">V</s-option>
                      <s-option value="J">J</s-option>
                      <s-option value="E">E</s-option>
                    </s-select>
                    <s-text-field
                      label="Documento de Identidad"
                      value={transferencia.ci}
                      onChange={(e: any) => setTransferencia({...transferencia, ci: e.target.value})}
                    />
                  </s-grid>
                </s-stack>
              </s-box>
            </s-grid-item>

            <s-grid-item>
              <s-box border="base" borderRadius="base" padding="base">
                <s-stack gap="base">
                  <s-heading>PayPal</s-heading>
                  <s-divider />
                  <s-text-field
                    label="Email"
                    value={paypal.email}
                    onChange={(e: any) => setPaypal({...paypal, email: e.target.value})}
                  />
                  <s-text-field
                    label="Titular"
                    value={paypal.titular}
                    onChange={(e: any) => setPaypal({...paypal, titular: e.target.value})}
                  />
                </s-stack>
              </s-box>
            </s-grid-item>
          </s-grid>
          <s-stack direction="inline" justifyContent="end" padding="base" gap="small" alignItems="center">
            {saveStatus === "saved" && <s-text tone="success">✓ Cambios guardados</s-text>}
            {saveStatus === "error" && <s-text tone="critical">✗ Error al guardar</s-text>}
            <s-button 
              variant="primary" 
              onClick={handleSave}
              disabled={saveStatus === "saving" || undefined}
              accessibilityLabel="Guardar cambios de configuración"
            >
              {saveStatus === "saving" ? "Guardando..." : "Guardar Cambios"}
            </s-button>
          </s-stack>
      </s-section>

      {/* === */}
      {/* Notifications */}
      {/* === */}
      <s-section heading="Notifications">
        <s-select
          label="Frecuencia de Notificaciones"
          name="notification-frequency"
        >
          <s-option value="immediately" selected>
            Inmediata
          </s-option>
          <s-option value="hourly">Hourly digest</s-option>
          <s-option value="daily">Daily digest</s-option>
        </s-select>
        <s-choice-list
          label="Notification types"
          name="notifications-type"
          multiple
        >
          <s-choice value="new-order" selected>New order notifications</s-choice>
          <s-choice value="low-stock">Low stock alerts</s-choice>

        </s-choice-list>
      </s-section>

      {/* Preferences */}
      <s-section heading="Preferencias">
        <s-box border="base" borderRadius="base">
          <s-clickable
            padding="small-100"
            href="/app/settings/shipping"
            accessibilityLabel="Configure shipping methods, rates, and fulfillment options"
          >
            <s-grid
              gridTemplateColumns="1fr auto"
              alignItems="center"
              gap="base"
            >
              <s-box>
                <s-heading>Límite crediticio para clientes</s-heading>
                <s-paragraph color="subdued">
                  Establece el límite máximo o mínimo permitido para las operaciones con clientes.
                </s-paragraph>
              </s-box>
              <s-icon type="chevron-right" />
            </s-grid>
          </s-clickable>
          <s-box paddingInline="small-100">
            <s-divider />
          </s-box>

          <s-clickable
            padding="small-100"
            href="/app/settings/products_catalog"
            accessibilityLabel="Configure product defaults, customer experience, and catalog settings"
          >
            <s-grid
              gridTemplateColumns="1fr auto"
              alignItems="center"
              gap="base"
            >
              <s-box>
                <s-heading>Conectarse a WhatsApp</s-heading>
                <s-paragraph color="subdued">
                  Conectar la aplicación con WhatsApp.
                </s-paragraph>
              </s-box>
              <s-icon type="chevron-right" />
            </s-grid>
          </s-clickable>
          <s-box paddingInline="small-100">
            <s-divider />
          </s-box>
        </s-box>
      </s-section>

      {/* === */}
      {/* Tools */}
      {/* === */}
      <s-section heading="Tools">
        <s-stack
          gap="none"
          border="base"
          borderRadius="base"
          overflow="hidden"
        >
          <s-box padding="small-100">
            <s-grid
              gridTemplateColumns="1fr auto"
              alignItems="center"
              gap="base"
            >
              <s-box>
                <s-heading>Restablecer configuraciones de la app</s-heading>
                <s-paragraph color="subdued">
                  Restablecer todas las configuraciones por defecti. Esta acción no puede deshacerse.
                </s-paragraph>
              </s-box>
              <s-button tone="critical" accessibilityLabel="Restablecer configuraciones de la aplicación">Restablecer</s-button>
            </s-grid>
          </s-box>
          <s-box paddingInline="small-100">
            <s-divider />
          </s-box>
        </s-stack>
    </s-section>
    {/*Footer*/}
    <s-stack padding="base" alignItems="center">
      <s-text>¿Tienes alguna duda?<s-link href="">Contáctanos</s-link>.</s-text>
    </s-stack>
  </Page>

  );
}
