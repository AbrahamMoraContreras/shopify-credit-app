import { useState, useEffect } from 'react';
import { useSearchParams, useLoaderData } from 'react-router';

const SPREADSHEET_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQqrzXGB4grT2FhonRlj3jZVC3E9sSaZl9gkgd0nSrwtA55E_Fcy7Q3QDCO8lTMlDS_D21wgDGaXJ1x/pub?output=csv";

export const loader = async () => {
  let tasaBcv: number | null = null;
  let tasaFecha: string | null = null;

  try {
    const csvRes = await fetch(SPREADSHEET_CSV_URL);
    if (csvRes.ok) {
      const text = await csvRes.text();
      const lines = text.trim().split("\n").filter((l) => l.trim());
      const lastLine = lines[lines.length - 1];
      // Format: "526,87 Bs.",22/05/2026 0:24:37
      const match = lastLine.match(/"([\d.,]+)\s*Bs\."/);
      if (match) {
        // "526,87" → replace comma with dot → 526.87
        tasaBcv = parseFloat(match[1].replace(".", "").replace(",", "."));
      }
      // Extract date portion
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
    tasaFecha,
  };
};

const VENEZUELAN_BANKS = [
  "(0102) BANCO DE VENEZUELA, S.A. BANCO UNIVERSAL",
  "(0104) BANCO VENEZOLANO DE CRÉDITO, S.A BANCO UNIVERSAL",
  "(0105) BANCO MERCANTIL C.A., BANCO UNIVERSAL",
  "(0108) BANCO PROVINCIAL, S.A. BANCO UNIVERSAL",
  "(0134) BANESCO BANCO UNIVERSAL, C.A.",
  "(0172) BANCAMIGA BANCO UNIVERSAL, C.A.",
  "(0174) BANPLUS BANCO UNIVERSAL, C.A.",
  "(0191) BANCO NACIONAL DE CRÉDITO C.A., BANCO UNIVERSAL",
  "Otro",
];

// API URL is derived from loader data dynamically

interface PaymentInfo {
  customer_name: string;
  customer_email: string;
  installment_number: number | null;
  amount: number;
  credit_id: number;
  pago_movil: Record<string, string> | null;
  transferencia: Record<string, string> | null;
}

export default function PagoPublico() {
  const [searchParams] = useSearchParams();
  const { BACKEND_URL, tasaBcv, tasaFecha } = useLoaderData<typeof loader>();
  const API = `${BACKEND_URL}/api`;
  const token = searchParams.get("token") ?? "";

  const [info, setInfo] = useState<PaymentInfo | null>(null);
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);

  const [form, setForm] = useState({
    bank_name: VENEZUELAN_BANKS[0],
    reference_number: "",
    amount: "",
    notes: "",
  });
  const [sending, setSending] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (!token) {
      setError("Enlace inválido. No se encontró el token de verificación.");
      setLoading(false);
      return;
    }
    fetch(`${API}/public/payment-info?token=${token}`)
      .then(async (r) => {
        if (!r.ok) {
          const d = await r.json().catch(() => ({}));
          throw new Error(d.detail ?? `Error ${r.status}`);
        }
        return r.json();
      })
      .then((data) => { setInfo(data); setForm(f => ({ ...f, amount: String(data.amount) })); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  // Determine if VES conversion applies (Pago Móvil or Transferencia)
  const isVesMethod = !!(info?.pago_movil || info?.transferencia);
  const montoUsd = info ? Number(info.amount) : 0;
  const montoVes = tasaBcv && montoUsd ? (montoUsd * tasaBcv) : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    if (!form.reference_number.trim()) { setFormError("El número de referencia es obligatorio."); return; }
    if (!form.amount || isNaN(Number(form.amount))) { setFormError("Ingresa un monto válido."); return; }

    // Auto-inject conversion info into notes
    let finalNotes = form.notes;
    if (isVesMethod && tasaBcv && montoVes) {
      const conversionNote = `[Conversión BCV] Tasa: ${tasaBcv.toFixed(2)} Bs/USD | Equivalente: Bs. ${montoVes.toFixed(2)} (Fecha tasa: ${tasaFecha || "hoy"})`;
      finalNotes = finalNotes
        ? `${finalNotes}\n${conversionNote}`
        : conversionNote;
    }

    setSending(true);
    try {
      const res = await fetch(`${API}/public/payment-proof`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, ...form, notes: finalNotes, amount: parseFloat(form.amount) }),
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

  if (loading) return (
    <div style={styles.page}>
      <div style={styles.card}><p style={styles.sub}>Cargando información de tu pago...</p></div>
    </div>
  );

  if (error) return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h2 style={{ ...styles.title, color: "#e53e3e" }}>Enlace inválido</h2>
        <p style={styles.sub}>{error}</p>
      </div>
    </div>
  );

  if (submitted) return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={{ fontSize: 48, textAlign: "center" }}>✅</div>
        <h2 style={{ ...styles.title, color: "#38a169" }}>¡Comprobante enviado!</h2>
        <p style={styles.sub}>Hemos recibido tu información de pago. Nuestro equipo la revisará próximamente.</p>
      </div>
    </div>
  );

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>Confirmación de Pago</h1>
        {info && (
          <div style={styles.infoBox}>
            <p style={styles.sub}><strong>Cliente:</strong> {info.customer_name}</p>
            {info.installment_number && <p style={styles.sub}><strong>Cuota:</strong> #{info.installment_number}</p>}
            <p style={styles.sub}><strong>Monto esperado:</strong> <span style={{ color: "#5C6AC4", fontWeight: "bold" }}>${Number(info.amount).toFixed(2)} USD</span></p>

            {/* VES conversion box */}
            {isVesMethod && tasaBcv && montoVes && (
              <div style={styles.conversionBox}>
                <p style={styles.conversionTitle}>💱 Equivalente en Bolívares (Tasa BCV)</p>
                <p style={styles.conversionAmount}>Bs. {montoVes.toFixed(2)}</p>
                <p style={styles.conversionRate}>
                  Tasa oficial: <strong>Bs. {tasaBcv.toFixed(2)}</strong> por USD
                  {tasaFecha && <span> — Actualizada: {tasaFecha}</span>}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Payment method details */}
        {info?.pago_movil && (
          <div style={styles.methodBox}>
            <h3 style={styles.methodTitle}>📱 Pago Móvil</h3>
            <p style={styles.methodLine}><strong>Banco:</strong> {info.pago_movil.banco}</p>
            <p style={styles.methodLine}><strong>Teléfono:</strong> {info.pago_movil.telefono}</p>
            <p style={styles.methodLine}><strong>Documento:</strong> {info.pago_movil.tipoCi}-{info.pago_movil.ci}</p>
            {montoVes && (
              <p style={{ ...styles.methodLine, marginTop: 8, fontWeight: 600, color: "#2B6CB0" }}>
                Monto a enviar: Bs. {montoVes.toFixed(2)}
              </p>
            )}
          </div>
        )}
        {info?.transferencia && (
          <div style={styles.methodBox}>
            <h3 style={styles.methodTitle}>🏦 Transferencia Bancaria</h3>
            <p style={styles.methodLine}><strong>Banco:</strong> {info.transferencia.banco}</p>
            <p style={styles.methodLine}><strong>Cuenta:</strong> {info.transferencia.numero}</p>
            <p style={styles.methodLine}><strong>Documento:</strong> {info.transferencia.tipoCi}-{info.transferencia.ci}</p>
            {montoVes && (
              <p style={{ ...styles.methodLine, marginTop: 8, fontWeight: 600, color: "#2B6CB0" }}>
                Monto a transferir: Bs. {montoVes.toFixed(2)}
              </p>
            )}
          </div>
        )}

        <hr style={{ margin: "24px 0", borderColor: "#E2E8F0" }} />
        <h2 style={{ ...styles.title, fontSize: 18 }}>Completa los datos de tu pago</h2>

        <form onSubmit={handleSubmit} style={styles.form}>
          <label style={styles.label}>Banco desde el que pago</label>
          <select style={styles.input} value={form.bank_name} onChange={e => setForm({ ...form, bank_name: e.target.value })}>
            {VENEZUELAN_BANKS.map(b => <option key={b} value={b}>{b}</option>)}
          </select>

          <label style={styles.label}>Número de referencia / comprobante</label>
          <input style={styles.input} value={form.reference_number} onChange={e => setForm({ ...form, reference_number: e.target.value })} placeholder="Ej: 00234567890" required />

          <label style={styles.label}>Monto transferido (USD)</label>
          <input style={styles.input} type="number" step="0.01" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} placeholder="0.00" required />

          {/* Show VES equivalent for the entered amount */}
          {isVesMethod && tasaBcv && form.amount && !isNaN(Number(form.amount)) && (
            <div style={styles.vesHint}>
              Equivale a <strong>Bs. {(Number(form.amount) * tasaBcv).toFixed(2)}</strong> a la tasa BCV de hoy
            </div>
          )}

          <label style={styles.label}>Notas adicionales (opcional)</label>
          <textarea style={{ ...styles.input, height: 72 }} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Cualquier información relevante..." />

          {formError && <p style={{ color: "#e53e3e", fontSize: 14 }}>{formError}</p>}

          <button type="submit" style={styles.button} disabled={sending}>
            {sending ? "Enviando..." : "Confirmar Pago"}
          </button>
        </form>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { minHeight: "100vh", background: "#F7FAFC", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px", fontFamily: "Inter, system-ui, sans-serif" },
  card: { background: "#fff", borderRadius: 12, boxShadow: "0 4px 24px rgba(0,0,0,0.08)", padding: "36px", maxWidth: 520, width: "100%" },
  title: { fontSize: 22, fontWeight: 700, color: "#1A202C", marginBottom: 4 },
  sub: { color: "#718096", margin: "4px 0", fontSize: 14 },
  infoBox: { background: "#EBF4FF", borderRadius: 8, padding: "12px 16px", marginBottom: 16 },
  methodBox: { background: "#F7FAFC", border: "1px solid #E2E8F0", borderRadius: 8, padding: "12px 16px", marginBottom: 12 },
  methodTitle: { fontSize: 15, fontWeight: 600, color: "#2D3748", marginBottom: 4 },
  methodLine: { fontSize: 13, color: "#4A5568", margin: "2px 0" },
  form: { display: "flex", flexDirection: "column", gap: 12 },
  label: { fontSize: 13, fontWeight: 600, color: "#4A5568" },
  input: { padding: "10px 12px", borderRadius: 6, border: "1px solid #CBD5E0", fontSize: 14, width: "100%", boxSizing: "border-box" as const, outline: "none" },
  button: { marginTop: 8, background: "#5C6AC4", color: "#fff", border: "none", borderRadius: 8, padding: "12px 0", fontSize: 16, fontWeight: 700, cursor: "pointer", transition: "background 0.2s" },
  conversionBox: { background: "#FFFBEB", border: "1px solid #F6E05E", borderRadius: 8, padding: "12px 16px", marginTop: 12 },
  conversionTitle: { fontSize: 13, fontWeight: 600, color: "#975A16", margin: "0 0 4px" },
  conversionAmount: { fontSize: 24, fontWeight: 700, color: "#B7791F", margin: "4px 0" },
  conversionRate: { fontSize: 12, color: "#975A16", margin: 0 },
  vesHint: { background: "#FFFBEB", border: "1px solid #F6E05E", borderRadius: 6, padding: "8px 12px", fontSize: 13, color: "#975A16" },
};
