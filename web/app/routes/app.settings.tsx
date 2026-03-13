import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router';

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

export default function Settings() {
  const { merchantId } = useOutletContext<{ merchantId: string }>();
  const [pagoMovil, setPagoMovil] = useState(DEFAULT_PAGO_MOVIL);
  const [transferencia, setTransferencia] = useState(DEFAULT_TRANSFERENCIA);
  const [paypal, setPaypal] = useState({ email: "", titular: "" });
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  useEffect(() => {
    if (!merchantId) return;
    fetch(`http://localhost:8000/api/merchants/settings`, {
      headers: { "X-Merchant-ID": merchantId }
    })
      .then(r => r.json())
      .then(data => {
        if (data.pago_movil) setPagoMovil({ ...DEFAULT_PAGO_MOVIL, ...data.pago_movil });
        if (data.transferencia) setTransferencia({ ...DEFAULT_TRANSFERENCIA, ...data.transferencia });
      })
      .catch(console.error);
  }, [merchantId]);

  const handleSave = async () => {
    setSaveStatus("saving");
    try {
      const res = await fetch(`http://localhost:8000/api/merchants/settings`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-Merchant-ID": merchantId
        },
        body: JSON.stringify({ pago_movil: pagoMovil, transferencia })
      });
      setSaveStatus(res.ok ? "saved" : "error");
    } catch {
      setSaveStatus("error");
    }
    setTimeout(() => setSaveStatus("idle"), 3000);
  };

  return(
    <s-page heading="Configuraciones" inlineSize="base">
      <s-section heading="Métodos de Pago">
          <s-grid
            gridTemplateColumns="repeat(3, 1fr)"
            gap="base"
            padding="base"
          >
            <s-grid-item>
              <s-box border="base" borderRadius="base" padding="base" background="surface">
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
                  <s-grid gridTemplateColumns="1fr 3fr" gap="tight" alignItems="end">
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
              <s-box border="base" borderRadius="base" padding="base" background="surface">
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
                  <s-grid gridTemplateColumns="1fr 3fr" gap="tight" alignItems="end">
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
              <s-box border="base" borderRadius="base" padding="base" background="surface">
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
              <s-button tone="critical">Restablecer</s-button>
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
  </s-page>

  );
}
