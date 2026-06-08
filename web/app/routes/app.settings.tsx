import { useState, useEffect } from "react";
import { type LoaderFunctionArgs, type ActionFunctionArgs } from "react-router";
import {
  useLoaderData,
  useSubmit,
  useNavigation,
  useActionData,
} from "react-router";
import { getAccessTokenForShop } from "../lib/auth.server";
import { authenticate } from "../shopify.server";
import { Page } from "@shopify/polaris";

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
  ci: "",
};

const DEFAULT_TRANSFERENCIA = {
  banco: "(0102) BANCO DE VENEZUELA, S.A. BANCO UNIVERSAL",
  numero: "",
  tipoCi: "V",
  ci: "",
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const accessToken = await getAccessTokenForShop(session.shop);
  if (!accessToken) throw new Error("Token no disponible");

  const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";
  const res = await fetch(`${BACKEND_URL}/api/merchants/settings`, {
    headers: { Authorization: `Bearer ${accessToken}` },
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
  const binance = formData.get("binance") ? JSON.parse(formData.get("binance") as string) : null;
  const zelle = formData.get("zelle") ? JSON.parse(formData.get("zelle") as string) : null;
  const zinli = formData.get("zinli") ? JSON.parse(formData.get("zinli") as string) : null;
  const debito = formData.get("debito") ? JSON.parse(formData.get("debito") as string) : null;
  const general = formData.get("general") ? JSON.parse(formData.get("general") as string) : null;

  const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";
  const res = await fetch(`${BACKEND_URL}/api/merchants/settings`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ pago_movil: pagoMovil, transferencia, binance, zelle, zinli, debito, general }),
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

  const [pagoMovil, setPagoMovil] = useState(
    settings?.pago_movil
      ? { ...DEFAULT_PAGO_MOVIL, ...settings.pago_movil }
      : DEFAULT_PAGO_MOVIL,
  );
  const [transferencia, setTransferencia] = useState(
    settings?.transferencia
      ? { ...DEFAULT_TRANSFERENCIA, ...settings.transferencia }
      : DEFAULT_TRANSFERENCIA,
  );
  const [binance, setBinance] = useState(
    settings?.binance ? { enabled: false, details: "", ...settings.binance } : { enabled: false, details: "" }
  );
  const [zelle, setZelle] = useState(
    settings?.zelle ? { enabled: false, details: "", ...settings.zelle } : { enabled: false, details: "" }
  );
  const [zinli, setZinli] = useState(
    settings?.zinli ? { enabled: false, details: "", ...settings.zinli } : { enabled: false, details: "" }
  );
  const [debito, setDebito] = useState(
    settings?.debito ? { enabled: false, details: "", ...settings.debito } : { enabled: false, details: "" }
  );
  const [general, setGeneral] = useState(
    settings?.general
      ? { silence_notifications: false, block_bad_reputation: false, ...settings.general }
      : { silence_notifications: false, block_bad_reputation: false }
  );
  const [paypal, setPaypal] = useState({ email: "", titular: "" });
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");

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
        transferencia: JSON.stringify(transferencia),
        binance: JSON.stringify(binance),
        zelle: JSON.stringify(zelle),
        zinli: JSON.stringify(zinli),
        debito: JSON.stringify(debito),
        general: JSON.stringify(general),
      },
      { method: "post" },
    );
  };

  return (
    <s-page inlineSize="base">
      <s-section heading="Métodos de Pago">
        <s-grid gridTemplateColumns="repeat(2, 1fr)" gap="base" padding="base">
          <s-grid-item>
            <s-box border="base" borderRadius="base" padding="base">
              <s-stack gap="base">
                <s-heading>Pago Móvil</s-heading>
                <s-divider />
                <s-select
                  label="Banco"
                  value={pagoMovil.banco}
                  onChange={(e: any) =>
                    setPagoMovil({ ...pagoMovil, banco: e.target.value })
                  }
                >
                  {VENEZUELAN_BANKS.map((bank) => (
                    <s-option key={bank} value={bank}>
                      {bank}
                    </s-option>
                  ))}
                </s-select>
                <s-text-field
                  label="Teléfono"
                  value={pagoMovil.telefono}
                  onChange={(e: any) =>
                    setPagoMovil({ ...pagoMovil, telefono: e.target.value })
                  }
                />
                <s-grid
                  gridTemplateColumns="1fr 3fr"
                  gap="small"
                  alignItems="end"
                >
                  <s-select
                    label="Tipo"
                    value={pagoMovil.tipoCi}
                    onChange={(e: any) =>
                      setPagoMovil({ ...pagoMovil, tipoCi: e.target.value })
                    }
                  >
                    <s-option value="V">V</s-option>
                    <s-option value="J">J</s-option>
                    <s-option value="E">E</s-option>
                  </s-select>
                  <s-text-field
                    label="Documento de Identidad"
                    value={pagoMovil.ci}
                    onChange={(e: any) =>
                      setPagoMovil({ ...pagoMovil, ci: e.target.value })
                    }
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
                  onChange={(e: any) =>
                    setTransferencia({
                      ...transferencia,
                      banco: e.target.value,
                    })
                  }
                >
                  {VENEZUELAN_BANKS.map((bank) => (
                    <s-option key={bank} value={bank}>
                      {bank}
                    </s-option>
                  ))}
                </s-select>
                <s-text-field
                  label="Número de Cuenta"
                  value={transferencia.numero}
                  onChange={(e: any) =>
                    setTransferencia({
                      ...transferencia,
                      numero: e.target.value,
                    })
                  }
                />
                <s-grid
                  gridTemplateColumns="1fr 3fr"
                  gap="small"
                  alignItems="end"
                >
                  <s-select
                    label="Tipo"
                    value={transferencia.tipoCi}
                    onChange={(e: any) =>
                      setTransferencia({
                        ...transferencia,
                        tipoCi: e.target.value,
                      })
                    }
                  >
                    <s-option value="V">V</s-option>
                    <s-option value="J">J</s-option>
                    <s-option value="E">E</s-option>
                  </s-select>
                  <s-text-field
                    label="Documento de Identidad"
                    value={transferencia.ci}
                    onChange={(e: any) =>
                      setTransferencia({ ...transferencia, ci: e.target.value })
                    }
                  />
                </s-grid>
              </s-stack>
            </s-box>
          </s-grid-item>
        </s-grid>

        <s-grid gridTemplateColumns="repeat(2, 1fr)" gap="base" padding="base">
          {/* Binance */}
          <s-grid-item>
            <s-box border="base" borderRadius="base" padding="base">
              <s-stack gap="base">
                <s-heading>Binance</s-heading>
                <s-divider />
                <s-checkbox
                  label="Habilitar Binance"
                  checked={binance.enabled}
                  onChange={(e: any) => setBinance({ ...binance, enabled: e.target.checked })}
                />
                {binance.enabled && (
                  <s-text-field
                    label="Email o Pay ID"
                    value={binance.details}
                    onChange={(e: any) => setBinance({ ...binance, details: e.target.value })}
                  />
                )}
              </s-stack>
            </s-box>
          </s-grid-item>

          {/* Zelle */}
          <s-grid-item>
            <s-box border="base" borderRadius="base" padding="base">
              <s-stack gap="base">
                <s-heading>Zelle</s-heading>
                <s-divider />
                <s-checkbox
                  label="Habilitar Zelle"
                  checked={zelle.enabled}
                  onChange={(e: any) => setZelle({ ...zelle, enabled: e.target.checked })}
                />
                {zelle.enabled && (
                  <s-text-field
                    label="Email o Teléfono"
                    value={zelle.details}
                    onChange={(e: any) => setZelle({ ...zelle, details: e.target.value })}
                  />
                )}
              </s-stack>
            </s-box>
          </s-grid-item>

          {/* Zinli */}
          <s-grid-item>
            <s-box border="base" borderRadius="base" padding="base">
              <s-stack gap="base">
                <s-heading>Zinli</s-heading>
                <s-divider />
                <s-checkbox
                  label="Habilitar Zinli"
                  checked={zinli.enabled}
                  onChange={(e: any) => setZinli({ ...zinli, enabled: e.target.checked })}
                />
                {zinli.enabled && (
                  <s-text-field
                    label="Email"
                    value={zinli.details}
                    onChange={(e: any) => setZinli({ ...zinli, details: e.target.value })}
                  />
                )}
              </s-stack>
            </s-box>
          </s-grid-item>

          {/* Débito */}
          <s-grid-item>
            <s-box border="base" borderRadius="base" padding="base">
              <s-stack gap="base">
                <s-heading>Débito (POS)</s-heading>
                <s-divider />
                <s-checkbox
                  label="Habilitar Punto de Venta"
                  checked={debito.enabled}
                  onChange={(e: any) => setDebito({ ...debito, enabled: e.target.checked })}
                />
                {debito.enabled && (
                  <s-text-field
                    label="Información Adicional (Opcional)"
                    value={debito.details}
                    onChange={(e: any) => setDebito({ ...debito, details: e.target.value })}
                  />
                )}
              </s-stack>
            </s-box>
          </s-grid-item>
        </s-grid>
        <s-stack
          direction="inline"
          justifyContent="end"
          padding="base"
          gap="small"
          alignItems="center"
        >
          {saveStatus === "saved" && (
            <s-text tone="success">✓ Cambios guardados</s-text>
          )}
          {saveStatus === "error" && (
            <s-text tone="critical">✗ Error al guardar</s-text>
          )}
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

      <s-section heading="Configuración General e Integraciones">
        <s-grid gridTemplateColumns="1fr" gap="base" padding="base">
          <s-grid-item>
            <s-box border="base" borderRadius="base" padding="base">
              <s-stack gap="base">
                <s-heading>Políticas y Alertas de la Tienda</s-heading>
                <s-divider />
                <s-checkbox
                  label="Silenciar alertas de la campanita (no recibir notificaciones flotantes al registrar pagos)"
                  checked={general.silence_notifications}
                  onChange={(e: any) => setGeneral({ ...general, silence_notifications: e.target.checked })}
                />
                <s-checkbox
                  label="Bloqueo automático de créditos para clientes con mala reputación (requiere bypass manual del admin)"
                  checked={general.block_bad_reputation}
                  onChange={(e: any) => setGeneral({ ...general, block_bad_reputation: e.target.checked })}
                />
              </s-stack>
            </s-box>
          </s-grid-item>
        </s-grid>
      </s-section>


      {/* === */}
      {/* Tools */}
      {/* === */}
      <s-section heading="Tools">
        <s-stack gap="none" border="base" borderRadius="base" overflow="hidden">
          <s-box padding="small-100">
            <s-grid
              gridTemplateColumns="1fr auto"
              alignItems="center"
              gap="base"
            >
              <s-box>
                <s-heading>Restablecer configuraciones de la app</s-heading>
                <s-paragraph color="subdued">
                  Restablecer todas las configuraciones por defecti. Esta acción
                  no puede deshacerse.
                </s-paragraph>
              </s-box>
              <s-button
                tone="critical"
                accessibilityLabel="Restablecer configuraciones de la aplicación"
              >
                Restablecer
              </s-button>
            </s-grid>
          </s-box>
          <s-box paddingInline="small-100">
            <s-divider />
          </s-box>
        </s-stack>
      </s-section>
      {/*Footer*/}
      <s-stack padding="base" alignItems="center" gap="base">
        <s-text color="subdued">Desarrollado por Opentech LCC</s-text>
        <s-text>
          ¿Tienes alguna duda?{" "}
          <s-link href="https://lccopen.tech/contact" target="_blank">
            Contáctanos
          </s-link>
          .
        </s-text>
      </s-stack>
    </s-page>
  );
}
