/* eslint-disable @typescript-eslint/no-explicit-any */

import { UUID } from 'crypto';
import { useEffect, useState} from 'react';


export default function RegistreCredit() {

  //Datos temporales del formulario
  const [form, setForm] = useState({
    customer: '',
    total_credit_amount: '',
    payMethod: '',
    exchange_rate: '',
    datepay: '',
    first_payment_date: '',
    frequency: 'mensual' as 'quincenal' | 'mensual',
    installment_number: '',
    installment_amount: ''
  });

  interface Credit {
    customer_id: number;
    concept: string;
    total_amount: number;
    balance: number;
    status: string;
    merchant_id: UUID;
    invoice_code: string;
    installments_count: number;
    created_at: string; // ISO datetime from API
    updated_at: string; // ISO datetime from API
    customer_name: string;
    customer_document_id: string;
    customer_extra: string | null;
  }


  const [credits, setCredits] = useState<Credit[]>([]);

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadCredits() {
      try {
        setLoading(true);
        setError(null);

        // NO TOCAR
        const response = await fetch('http://localhost:8000/api/credits/credits');
        if (!response.ok) {
          throw new Error(`Error cargando créditos: ${response.status}`);
        }

        const data: Credit[] = await response.json();
        setCredits(data);
      } catch (err: unknown) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('Error desconocido al cargar créditos');
        }
      } finally {
        setLoading(false);
      }
    }

    void loadCredits();
  }, []);

  const totalCreditNumber = toNumber(form.total_credit_amount, 0);
  const installmentNumber = toNumber(form.installment_number, 0);

  const installmentAmount = CalculateInstallmentAmount(
    totalCreditNumber,
    installmentNumber,
  );

  const schedule = generateInstallmentSchedule(
    form.first_payment_date,
    form.frequency
  );

  const payMethods = [
    { value: '1', label: 'Pago Móvil' },
    { value: '2', label: 'Transferencia Bancaria' },
    { value: '3', label: 'Efectivo' },
    { value: '4', label: 'Efectivo (Divisas)' },
    { value: '5', label: 'PayPal' },
  ] as const;

/*   // Optional: detail text keyed by value
  const payMethodDescriptions: Record<string, string> = {
    '1': 'Pago Móvil: pago instantáneo mediante banca móvil.',
    '2': 'Transferencia Bancaria: requiere confirmación del banco.',
    '3': 'Efectivo: pago en moneda local.',
    '4': 'Efectivo (Divisas): pago en dólares u otra divisa.',
    '5': 'PayPal: pago electrónico a través de PayPal.',
  };

  //const selectedPayMethodLabel =
  //  payMethods.find((m) => m.value === form.payMethod)


  const selectedPayMethodDescription =
    form.payMethod && payMethodDescriptions[form.payMethod]
    ? payMethodDescriptions[form.payMethod]
    : 'Seleccione un método de pago para ver más detalles.'; */

  // Métodos para hacer que los textos se vean interlineados- Don't Touch...
  const descriptionByCustomer: Record<string, string> = {
    '1': 'Jose Marquez.\n'+
          'Créditos Totales: 10.\n'+
          'Créditos Completados: 5.\n'+
          'Créditos Activos: 0.\n'+
          'Créditos Morosos: 0.\n'+
          'Reputación crediticia: Buena',
    '2': 'Alex Jones.\n'+
          'Créditos Totales: 10.\n'+
          'Créditos Completados: 1.\n' +
          'Créditos Activos: 3.\n' +
          'Créditos Morosos: 2.\n' +
          'Reputación crediticia: Mala.',
    '3': 'Fatima Flores.\n' +
          'Créditos Totales: 10.\n' +
          'Créditos Completados: 5.\n' +
          'Créditos Activos: 2.\n' +
          'Créditos Morosos: 0.\n' +
          'Reputación crediticia: Regular.'
  };

  const selectedDescription =
    form.customer && descriptionByCustomer[form.customer]
      ? descriptionByCustomer[form.customer]
      : 'Seleccione un cliente para ver más detalles.';

  const descriptionLines = selectedDescription.split('\n');

  //Método para convertir strings --> numbers. Don't touch...
  function toNumber(
    value: string | number | null | undefined,
    defaultValue = 0,
  ): number {
    if (value === null || value === undefined) return defaultValue;
    if (typeof value === 'number') {
      return Number.isNaN(value) ? defaultValue : value;
    }

    const trimmed = value.trim();
    if (trimmed === '') return defaultValue;

    const parsed = Number(trimmed);
    return Number.isNaN(parsed) ? defaultValue : parsed;
  }

  //

  function CalculateInstallmentAmount(
    total_credit_amount: number,
    installment_number: number,
  ) {
    if (!total_credit_amount || !installment_number) return 0;
    return Number((total_credit_amount / installment_number).toFixed(2));
  }

  //
  // Helper: add days to a YYYY-MM-DD string
function addDays(baseDateISO: string, days: number): string {
  const date = new Date(baseDateISO + 'T00:00:00');
  if (Number.isNaN(date.getTime())) return baseDateISO;
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10); // YYYY-MM-DD
}

// Helper: add months to a YYYY-MM-DD string
function addMonths(baseDateISO: string, months: number): string {
  const date = new Date(baseDateISO + 'T00:00:00');
  if (Number.isNaN(date.getTime())) return baseDateISO;

  const dayOfMonth = date.getDate();
  date.setMonth(date.getMonth() + months);

  // Handle month rollover (e.g., from Jan 31 -> Feb)
  if (date.getDate() < dayOfMonth) {
    date.setDate(0); // last day of previous month
  }

  return date.toISOString().slice(0, 10);
}

// Generate an array of future installment dates based on start date, count, and frequency
function generateInstallmentSchedule(
  startDateISO: string,
  frequency: 'quincenal' | 'mensual',
): string[] {
  if (!startDateISO || installmentNumber <= 0) return [];

  const dates: string[] = [];
  for (let i = 1; i <= installmentNumber; i += 1) {
    if (frequency === 'quincenal') {
      dates.push(addDays(startDateISO, 15 * i));
    } else {
      dates.push(addMonths(startDateISO, i));
    }
  }
  return dates;
  }

    return (
    <s-page heading="Registrar Créditos">
      <s-stack gap="base">
        <s-grid
          gridTemplateColumns="repeat(2, 2fr, 1fr)"
          gap="small"
          justifyContent="center"
          padding="base"
        >
          <s-section>
            <s-heading>Nombre de Cliente</s-heading>

            <s-grid
              gridTemplateColumns="repeat(2, 3fr)"
              gap="small"
              padding="base"
              alignContent="space-between"
              >
              <s-grid-item gridColumn="span 1">
                {loading && (
                  <s-text>Cargando créditos...</s-text>
                )}

                {error && (
                  <s-text tone="critical">{error}</s-text>
                )}

                {!loading && !error && credits.length === 0 && (
                  <s-text color="subdued">No hay créditos registrados.</s-text>
                )}

                {!loading && !error && credits.length > 0 && (
                  <s-select
                    label="Cliente"
                    details="Seleccione nombre del cliente"
                    value={form.customer}
                    onChange={(event: any) => {
                      const raw = (event.currentTarget as any).value as
                        | string
                        | undefined;

                      setForm((prev) => ({
                        ...prev,
                        customer: raw ?? '',
                      }));
                    }}
                  >
                    {credits.map((credit, index) => (
                      <s-option key={`${index}`}>
                        {index + 1}
                        {index < credits.length - 1 && <br />}
                      </s-option>
                    ))}

                  </s-select>
                )}
              </s-grid-item>

              <s-grid-item gridColumn="auto">
                <s-section accessibilityLabel="Info de los clientes">
                  <s-stack direction="inline" justifyContent="center" padding='base'>
                    <s-box>
                      <s-text tone='info'>
                        {descriptionLines.map((line, index) => (
                          <span key={index}>
                            {line}
                            {index < descriptionLines.length - 1 && <br />}
                          </span>
                        ))}
                      </s-text>
                    </s-box>
                  </s-stack>
                </s-section>
              </s-grid-item>
            </s-grid>

            <s-grid
              gridTemplateColumns="repeat(3, 1fr)"
              gap="small"
              justifyContent="center"
              padding="base"
            >
              {/* Fecha de Pago */}
              <s-grid-item gridColumn="span 1" >
                <s-section>
                  <s-date-field
                    label="Cambiar o Eliminar"
                    details="Seleccione fecha de pago"
                    defaultView="2025-09"
                    defaultValue="2025-09-01"
                    value={form.datepay}
                  />
                </s-section>
              </s-grid-item>

              {/* Tasa de Cambio */}
              <s-grid-item gridColumn="span 1" >
                <s-section>
                  <s-number-field
                    label="Tasa de cambio (BS)"
                    details="Tasa de cambio"
                    placeholder="300"
                    value={form.exchange_rate}
                    step={1}
                    min={0}
                    max={100}
                  />
                </s-section>
              </s-grid-item>

              {/* Métodos de Pago */}
              <s-grid-item gridColumn="span 1" >
                <s-section >
                  <s-select
                    label="Metodo de pago"
                    details="Seleccione método de pago"
                    value={form.payMethod}
                    onChange={(event: any) => {
                      const raw = (event.currentTarget as any).value as string | undefined;
                      setForm((prev) => ({
                        ...prev,
                        payMethod: raw ?? '',
                      }));
                    }}
                  >
                    {payMethods.map((method) => (
                      <s-option key={method.value} value={method.value}>
                        {method.label}
                      </s-option>
                    ))}
                  </s-select>


                </s-section>
              </s-grid-item>
            </s-grid>


            <s-grid
              gridTemplateColumns="repeat(3, 1fr)"
              gap="small"
              padding="base"
            >
              <s-grid-item gridColumn="auto"  >
                <s-section>
                      <s-number-field
                        label="Monto total del Crédito (USD)"
                        details="Monto a pagar (USD). Ejemplo: 100.5"
                        placeholder="0"
                        inputMode="numeric"
                        value={(form.total_credit_amount)}
                        step={1}
                        min={1}
                        max={100000}
                        onChange={(event: any) => {
                          const raw = (event.currentTarget as any).value as
                            | string
                            | undefined;
                          setForm((prev) => ({
                            ...prev,
                            total_credit_amount: raw ?? '',
                          }));
                        }}
                      >
                      </s-number-field>

                </s-section>
              </s-grid-item>

                <s-section >
                    <s-number-field
                      label="Numero de Cuotas"
                      placeholder="1"
                      inputMode="decimal"
                      value={form.installment_number}
                      onChange={(event: any) => {
                        const raw = (event.currentTarget as any).value as
                          | string
                          | undefined;
                        setForm((prev) => ({
                          ...prev,
                          installment_number: raw ?? '',
                        }));
                      }}
                      step={1}
                      min={1}
                      max={100000}
                    />
                </s-section>

                <s-section >
                    <s-text-field
                      label="Monto por Cuotas"
                      placeholder=""
                      value={installmentAmount === 0
                        ? ''
                        : installmentAmount.toFixed(2)
                      }
                      disabled={true}
                    >
                    </s-text-field>

                    <s-text type="strong" color="subdued">
                      Total={totalCreditNumber} cuotas={installmentNumber} monto/cuota={installmentAmount.toFixed(2)}
                    </s-text>

                </s-section>
            </s-grid>


            <s-grid
              gridTemplateColumns="repeat(3, 1fr)"
              gap="small"
              justifyContent="center"
              padding="base"
            >

              {/* Fecha de emisión / fecha base */}
              <s-grid-item gridColumn="span 1" >
                <s-section>
                  <s-date-field
                    label="Fecha de emisión del crédito"
                    details="Usada como base para calcular las fechas de pago"
                    value={form.first_payment_date}
                    onChange={(event: any) => {
                      const raw = (event.currentTarget as any).value as string | undefined;
                      setForm((prev) => ({
                        ...prev,
                        first_payment_date: raw ?? '',
                      }));
                    }}
                  />
                </s-section>
              </s-grid-item>

              <s-grid-item gridColumn="span 1" >
                {/* Frecuencia de pago */}
                <s-select
                  label="Frecuencia de pago"
                  details="Seleccione quincenal o mensual"
                  value={form.frequency}
                  onChange={(event: any) => {
                    const raw = (event.currentTarget as any).value as string | undefined;
                    if (raw === 'quincenal' || raw === 'mensual') {
                      setForm((prev) => ({
                        ...prev,
                        frequency: raw,
                      }));
                    }
                  }}
                >
                  <s-option value="quincenal">Quincenal</s-option>
                  <s-option value="mensual">Mensual</s-option>
                </s-select>
              </s-grid-item>

                {/* Lista de fechas calculadas */}
              <s-grid-item gridColumn="span 1" >
                <s-section heading="Próximas fechas de pago">
                <s-stack  justifyContent="end">
                  {schedule.length === 0 ? (
                      <s-text color="subdued">
                        Ingrese la fecha de emisión y el número de cuotas para ver el calendario.
                      </s-text>
                    ) : (
                      schedule.map((date, index) => (
                          <s-text key={`${date}-${index}`}>
                            Cuota {index + 1}: {date}
                            {index < schedule.length - 1 && <br />}
                          </s-text>
                      ))
                    )}
                </s-stack>
                </s-section>
              </s-grid-item>

            </s-grid>

            <s-grid
              gridTemplateColumns="repeat(1, 3fr)"
              gap="small"
              padding="base"
            >
              <s-text-area
                    label="Notas"
                    value=""
                    rows={3}
                />
            </s-grid>
          </s-section>

          <s-grid-item gridColumn="auto" >
              <s-section >
                <s-text-field
                      label="Productos"
                      value=""
                      placeholder="products"
                />
                </s-section>
            </s-grid-item>
          <s-checkbox
            label="Seleccionar ordenes automáticamente"
            details="ordenes"
          />

          <s-section padding="base">
            {/* Products Table */}
            <s-heading>Lista de Productos</s-heading>
            <s-table>
              <s-table-header-row>
                <s-table-header>Código de Producto</s-table-header>
                <s-table-header>Fecha de Emisión</s-table-header>
                <s-table-header>Productos</s-table-header>
                <s-table-header format="numeric">Monto</s-table-header>
                <s-table-header>Método de Pago</s-table-header>
                <s-table-header>Número de Cuotas</s-table-header>
                <s-table-header>Fecha de Próxima Cuota</s-table-header>
                <s-table-header>Notes</s-table-header>

              </s-table-header-row>
              <s-table-body>
                <s-table-row>
                  <s-table-cell>John Smith</s-table-cell>
                  <s-table-cell>john@example.com</s-table-cell>
                  <s-table-cell>23</s-table-cell>
                  <s-table-cell>123-456-7890</s-table-cell>
                  <s-table-cell>123-456-7890</s-table-cell>

                </s-table-row>
                <s-table-row>
                  <s-table-cell>Jane Johnson</s-table-cell>
                  <s-table-cell>jane@example.com</s-table-cell>
                  <s-table-cell>15</s-table-cell>
                  <s-table-cell>234-567-8901</s-table-cell>
                  <s-table-cell>123-456-7890</s-table-cell>

                </s-table-row>
                <s-table-row>
                  <s-table-cell>Brandon Williams</s-table-cell>
                  <s-table-cell>brandon@example.com</s-table-cell>
                  <s-table-cell>42</s-table-cell>
                  <s-table-cell>345-678-9012</s-table-cell>
                  <s-table-cell>123-456-7890</s-table-cell>

                </s-table-row>
              </s-table-body>
            </s-table>
          </s-section>

          {/* Pendiente Align End. */}
          <s-divider/>
          <s-section padding="base">
            <s-stack
              direction="block"
              alignItems="end"
              gap="small-100"
            >
                  <s-heading text-justify="end">Código de Producto: ######: $64.00</s-heading>
                  <s-heading>Código de Producto: ######: $43.00</s-heading>
                  <s-heading>Monto Total: $107.00</s-heading>
                  <s-heading>Monto a Pagar: $100.00</s-heading>
                  <s-heading>Deuda Pendiente: $7.00</s-heading>
            </s-stack>
          </s-section>
          <s-stack padding="base"  direction="inline" justifyContent="end" >
            <s-button-group gap="base" >
              <s-button slot="primary-action">Registrar Pago</s-button>
              <s-button slot="secondary-actions">Limpiar Todo</s-button>
            </s-button-group>
          </s-stack>
        </s-grid>

        <s-divider/>

      </s-stack>
      {/*Footer*/}
      <s-stack padding="base" alignItems="center">
        <s-text>¿Tienes alguna duda?<s-link href="">Contáctanos</s-link>.</s-text>
      </s-stack>
    </s-page>
  );
}
