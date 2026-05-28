# Contexto Arquitectónico y Técnico del Proyecto (Living Document)

> [!IMPORTANT]  
> Este es un documento vivo que contiene la arquitectura, modelo de datos, flujos y reglas del sistema `shopify-credit-app`. **Cualquier modelo o agente de IA que trabaje en este proyecto debe leer este archivo antes de realizar modificaciones y DEBE mantenerlo actualizado con cualquier cambio relevante en la base de datos, backend o frontend.**

---

## 1. Vista General del Sistema

El sistema es una plataforma de financiamiento y crédito ("Compra ahora, paga después" o "Fiado") integrada con Shopify. Permite a los comercios otorgar créditos sobre pedidos y gestionar sus cuotas, pagos esperados, recordatorios por correo electrónico y aprobaciones de pagos.

### Componentes de la Arquitectura
1. **Frontend de Administración (React / Remix / Shopify Polaris):**
   * Ubicado en: `React/credit-app/web`
   * Interfaz privada del merchant embebida en el panel de Shopify Admin.
   * Administra créditos, clientes, listado de pagos, detalles de transacciones, configuración de pasarelas y envío de recordatorios.
2. **Formulario Público de Reporte de Pago (React / Material UI):**
   * Ubicado en: `React/page` (Repositorio público: `registre-payment-shopify-form`)
   * Desplegado en: `https://registre-payment-shopify-form.onrender.com`
   * Formulario de cara al cliente final para reportar transacciones bancarias (referencias, capturas, montos) a través de un token de acceso seguro de un solo uso.
3. **Backend de Servicios (FastAPI / SQLAlchemy / PostgreSQL / Alembic):**
   * Ubicado en: `React/credit-app/backend`
   * Provee la API REST, autenticación JWT basada en dominios de Shopify, lógica de distribución de cuotas, generación de tokens públicos temporales y envío de correos mediante Resend.
   * Base de datos PostgreSQL alojada en Render con migraciones manejadas por Alembic.

---

## 2. Estructura y Modelo de la Base de Datos

El diseño de la base de datos se describe a continuación basándose en los modelos ORM definidos en SQLAlchemy (`backend/src/models`) y mapeados en Prisma (`web/prisma/schema.prisma`):

### Enums Globales
1. **`CreditStatus`:** Estado general de un financiamiento.
   * `PENDIENTE_ACTIVACION`
   * `EMITIDO`
   * `EN_PROGRESO`
   * `MOROSO`
   * `PAGADO`
   * `CANCELADO`
2. **`InstallmentStatus`:** Estado individual de una cuota de crédito.
   * `PENDIENTE`
   * `PAGADA`
   * `VENCIDO`
   * `CANCELADA`
3. **`PaymentStatus`:** Estado de validación de un pago reportado.
   * `EN_REVISION`
   * `APROBADO`
   * `RECHAZADO`
   * `REGISTRADO` (Cuando se genera una intención de pago vía link)
   * `CANCELADO`

---

### Mapeo de Tablas e Identidades

#### A. `merchants` (Comercios de Shopify)
* **`id`**: `UUID` (Primary Key).
* **`shop_domain`**: `String` (Único). Dominio del comercio en Shopify.
* **`access_token`**: `String` (Opcional). Token de acceso a la API de Shopify Admin.
* **`pago_movil_settings`**: `JSONB` (Opcional). Configuración de Pago Móvil.
* **`transferencia_settings`**: `JSONB` (Opcional). Configuración de cuenta bancaria.
* **`binance_settings`**, **`zelle_settings`**, **`zinli_settings`**, **`debito_settings`**: `JSONB` (Opcional). Parámetros de pasarelas internacionales.
* **Trazabilidad:** Propietario de clientes (`customers`), créditos (`credits`) y tokens de pago (`payment_tokens`).

#### B. `customers` (Clientes asociados a un comercio)
* **`id`**: `Integer` (Primary Key, autoincrement).
* **`merchant_id`**: `UUID` (Foreign Key -> `merchants.id`).
* **`full_name`**: `String`. Nombre completo.
* **`email`**: `String` (Opcional). Correo para envío de recordatorios.
* **`shopify_customer_id`**: `BigInteger` (Opcional). ID del cliente dentro de Shopify.
* **`favorable_balance`**: `Numeric(12, 2)`. Saldo a favor sobrante acumulado (Overpayment).
* **`punctuality_score`**: `Numeric(5, 2)` (Opcional). Promedio móvil de puntualidad de pagos aprobados (0.00 a 100.00).

#### C. `credits` (Financiamientos otorgados)
* **`id`**: `Integer` (Primary Key, autoincrement).
* **`customer_id`**: `Integer` (Foreign Key -> `customers.id`).
* **`merchant_id`**: `UUID` (Foreign Key -> `merchants.id`). *[Desnormalización 3NF]*
* **`concept`**: `String`. Concepto o número de orden/factura.
* **`total_amount`**: `Numeric(12, 2)`. Monto total financiado.
* **`balance`**: `Numeric(12, 2)`. Saldo restante por pagar.
* **`installments_count`**: `Integer`. Número de cuotas pactadas. Si es `0`, se considera tipo "Fiado" (pago único sin cuotas).
* **`status`**: `CreditStatus`. Estado del crédito.
* **`created_at`**: `DateTime`. Fecha de emisión.

#### D. `credit_installments` (Cuotas de créditos basados en cuotas)
* **`id`**: `Integer` (Primary Key, autoincrement).
* **`credit_id`**: `Integer` (Foreign Key -> `credits.id`, Cascade Delete).
* **`number`**: `Integer`. Índice de la cuota (ej. 1, 2, 3).
* **`amount`**: `Numeric(12, 2)`. Monto esperado de la cuota.
* **`due_date`**: `Date` (Opcional). Fecha límite de pago.
* **`status`**: `InstallmentStatus`. Estado actual de la cuota.
* **`paid_amount`**: `Numeric(12, 2)`. Monto que ya ha sido abonado a esta cuota en particular.
* **`paid_at`**: `DateTime` (Opcional). Fecha en la que se terminó de pagar la cuota.

#### E. `credit_items` (Detalle de productos financiados en el crédito)
* **`id`**: `Integer` (Primary Key, autoincrement).
* **`credit_id`**: `Integer` (Foreign Key -> `credits.id`, Cascade Delete).
* **`product_id`**: `String` (ID de Shopify).
* **`product_code`**: `String` (Opcional). SKU del producto.
* **`product_name`**: `String`. Nombre del artículo.
* **`quantity`**: `Integer`. Cantidad comprada.
* **`unit_price`**: `Numeric(12, 2)`. Precio unitario del artículo.
* *Nota:* Actúa como un snapshot inmutable para auditoría financiera.

#### F. `payments` (Pagos realizados o reportados)
* **`id`**: `Integer` (Primary Key, autoincrement).
* **`credit_id`**: `Integer` (Foreign Key -> `credits.id`, Cascade Delete).
* **`installment_id`**: `Integer` (Foreign Key -> `credit_installments.id`, Opcional, Cascade Delete).
* **`amount`**: `Numeric(12, 2)`. Monto del pago reportado.
* **`reference_number`**: `String`. Código de referencia de la transferencia.
* **`payment_method`**: `String` (Opcional). Pasarela o método (`PAGO_MOVIL`, `BANK`, etc.).
* **`bank_name`**: `String` (Opcional). Banco emisor/destino.
* **`status`**: `PaymentStatus`. Estado del pago en auditoría.
* **`payment_date`**: `DateTime`. Fecha en la que el cliente alega haber hecho el pago.
* **`reviewed_at`**: `DateTime` (Opcional). Fecha de aprobación o rechazo.
* **`reviewed_by`**: `UUID` (Opcional, Foreign Key -> `merchants.id`). Merchant que auditó el pago.
* **`notes`**: `String` (Opcional). Notas adjuntas por el comerciante o inyectadas por el sistema (ej. comprobantes de exceso o parciales).
* **`installments_covered`**: `String` (Opcional). Cadena de texto de cuotas cubiertas (ej. `"1,2"`). *[Desnormalización 1NF]*
* **`punctuality_value`**: `Numeric(5, 2)` (Opcional). Puntuación de puntualidad del pago (`100.00` = a tiempo, `0.00` = tarde).
* **`merchant_id`**: `UUID` (Foreign Key -> `merchants.id`). *[Desnormalización 3NF]*
* **Trazabilidad:** Se enlaza a un `PaymentToken` único si se originó mediante un recordatorio de cobro por correo.

#### G. `payment_tokens` (Enlaces seguros de cobro temporal)
* **`id`**: `UUID` (Primary Key).
* **`token`**: `String` (Único). UUID del enlace de pago.
* **`payment_id`**: `Integer` (Foreign Key -> `payments.id`, Cascade Delete). Representa el "Payment Intent" con estado `REGISTRADO`.
* **`merchant_id`**: `UUID` (Foreign Key -> `merchants.id`, Cascade Delete).
* **`customer_email`**: `String`. Destinatario del cobro.
* **`expires_at`**: `DateTime`. Expiración del enlace (por defecto, 72 horas).
* **`used_at`**: `DateTime` (Opcional). Fecha en la que el cliente ingresó y envió el formulario de reporte de pago.

#### H. `payment_proofs` (Comprobantes de transferencias reportadas por clientes)
* **`id`**: `Integer` (Primary Key, autoincrement).
* **`token_id`**: `UUID` (Foreign Key -> `payment_tokens.id`, Cascade Delete).
* **`reference_number`**: `String`. Referencia reportada.
* **`bank_name`**: `String`. Banco emisor.
* **`amount`**: `Numeric(12, 2)`. Monto reportado por el usuario.
* **`notes`**: `String` (Opcional). Notas adicionales (ej. C.I., número de cuenta y teléfono concatenados).
* **`submitted_at`**: `DateTime`. Fecha de reporte.
* **`status`**: `String` (Por defecto, `"PENDIENTE"`).

---

## 3. Trazabilidad del Flujo de Datos (End-to-End)

El ciclo de vida de los datos fluye transparentemente entre el Frontend, el Backend y la Base de Datos bajo cuatro flujos nucleares:

### Flujo 1: Emisión de Crédito
1. El **Merchant** crea un crédito desde el panel de Remix.
2. **ReactAdmin** hace POST a `/api/credits` en el **FastAPI Backend**.
3. **Backend** inserta en la base de datos PostgreSQL la entidad `Credit` con sus `CreditInstallments` y `CreditItem`s mediante SQLAlchemy.
4. Los datos guardados se reflejan inmediatamente en la UI del panel administrativo de Shopify.

### Flujo 2: Envío de Recordatorio
1. El **Merchant** pulsa en "Enviar Recordatorio" desde la UI.
2. **ReactAdmin** hace POST a `/api/payments/payment-tokens`.
3. El **Backend** genera un registro `Payment` (con estado `REGISTRADO`) y un `PaymentToken` temporal.
4. El **Backend** envía un correo electrónico al cliente final vía **Resend API** conteniendo el enlace único de reporte.
5. El **Frontend** actualiza dinámicamente el estado del botón a "¡Enviado!" de manera persistente.

### Flujo 3: Reporte Público de Pago
1. El **Cliente** abre la URL pública de pago con el Token inyectado en su navegador.
2. El formulario **React Público** hace GET a `/api/public/payment-info?token=XYZ` para precargar la tienda, productos y deuda.
3. El **Cliente** ingresa su comprobante de pago (Banco emisor, Referencia y Notas) y lo envía.
4. El frontend hace POST a `/api/public/payment-proof`.
5. El **Backend** cambia el estado de `Payment` a `EN_REVISION` y guarda el comprobante asociado en `payment_proofs`.
6. En el panel del merchant se notifica la recepción de un pago pendiente para su respectiva auditoría.

### Flujo 4: Auditoría e Impacto de Saldos
1. El **Merchant** revisa la referencia y aprueba o rechaza el pago en `app.payment_detail.$id.tsx`.
2. El frontend de Remix hace un PATCH a `/api/payments/{id}/review` con el nuevo estado (`APROBADO` o `RECHAZADO`).
3. Si el estado es `APROBADO`:
   * El **Backend** descuenta el balance general del crédito.
   * Distribuye el pago entre las cuotas pendientes (`_apply_payment_distribution`).
   * Calcula la puntualidad (`punctuality_value`) para retroalimentar la reputación del cliente.
   * Si hay excedente, incrementa el saldo a favor del cliente (`favorable_balance`).
4. Si el estado es `RECHAZADO`:
   * Si había sido aprobado antes, el **Backend** ejecuta el proceso de reversión matemática (devuelve el balance a las cuotas y al crédito general, y resta saldo a favor si se generó).
5. Se guardan las acciones en `audit_logs` e `history` para trazabilidad de auditoría.

---

## 4. Reglas de Negocio Clave y Algoritmos Complejos

### A. Algoritmo de Distribución de Pagos (`_apply_payment_distribution`)
Cuando un pago se marca como `APROBADO` (o se efectúa directo desde Saldo a Favor), el backend distribuye el monto siguiendo esta prioridad:
1. **Determinar Monto a Aplicar:**
   * Si es crédito de tipo **Fiado (sin cuotas)**, el pago se limita al saldo restante (`balance`). Cualquier excedente se destina a saldo a favor del cliente (`favorable_balance`).
   * Si es un crédito basado en cuotas, y el usuario **no** marcó `distribute_excess` (distribuir exceso), el pago se restringe estrictamente a la deuda total de las cuotas seleccionadas (`target_installment_ids`). Los excedentes van a `favorable_balance`.
   * Si se marca `distribute_excess`, el sobrante se cascada automáticamente sobre el resto de las cuotas pendientes ordenadas por fecha de vencimiento (`due_date` ascendente).
2. **Actualización de Cuotas (`CreditInstallment`):**
   * Se recorren las cuotas seleccionadas. Si el fondo restante es mayor o igual a la deuda de la cuota (con una tolerancia de precisión `epsilon = 0.01`), se marca la cuota como `PAGADA`, se le asigna la fecha actual a `paid_at` y se descuenta del remanente.
   * Si el remanente no cubre la totalidad de la cuota, se realiza un pago parcial y el remanente baja a `0`.
3. **Cálculo Automático de Puntualidad (`punctuality_value`):**
   * Si el crédito tiene cuotas y no se especificó un valor manual, el sistema compara la fecha real del pago (`payment_date`) contra la fecha de vencimiento más temprana (`due_date`) del grupo de cuotas cubiertas por la transacción.
   * Si el pago es menor o igual a la fecha de vencimiento: `punctuality_value = 100` (A tiempo).
   * Si es mayor: `punctuality_value = 0` (Tarde).
   * Estos valores se promedian en `customer.punctuality_score` para calcular su reputación (`excelente`, `buena`, `regular`, `mala`).

### B. Lógica de Reversión Bancaria (`review_payment` con RECHAZADO)
Si un pago aprobado anteriormente es marcado como `RECHAZADO` en una auditoría posterior, el sistema ejecuta una reversión matemática perfecta:
1. Revierte los estados de las cuotas listadas en `installments_covered` de `PAGADA` a `PENDIENTE`.
2. Restablece el `paid_amount` de esas cuotas a `0.00` y limpia la fecha `paid_at`.
3. Suma el monto revertido al balance general del crédito (`credit.balance`).
4. Si el pago generó saldo a favor, lo deduce de `customer.favorable_balance` (evitando saldos negativos).
5. Si el crédito estaba en estado `PAGADO`, lo regresa a `EN_PROGRESO`.
6. Recalcula el `punctuality_score` del cliente excluyendo esta transacción.

---

## 5. Mantenimiento y Reglas de Consistencia (Evitar que el Frontend se rompa)

Al refactorizar el backend para alcanzar la **Tercera Forma Normal (3NF)**, las siguientes estructuras del DTO (Data Transfer Object) deben permanecer idénticas para evitar incompatibilidades con React:

1. **Configuración del Merchant (`/api/merchants/settings`):**
   * El frontend espera obtener objetos JSON con una estructura de llaves fijas (`banco`, `telefono`, `numero`, `tipoCi`, `ci`).
   * **Consistencia:** Si las configuraciones se extraen a un modelo relacional de base de datos normalizado, el backend **debe** mapear y transformar esas relaciones en un diccionario JSON plano antes de responder a Remix.
2. **Comprobantes e Historial (`/api/payments`):**
   * El frontend lee el campo string `installments_covered` (ej. `"1, 2"`) para mostrar en las tablas qué cuotas cubrió un pago.
   * **Consistencia:** Si se normaliza este campo a una tabla intermedia muchos-a-muchos, el backend debe concatenar los números de cuotas mapeados en formato de texto `"1, 2"` dentro del serializador de Pydantic antes de responder al cliente HTTP.
3. **Filtros por `merchant_id`:**
   * La eliminación de `merchant_id` en `credits` y `payments` requiere que las consultas internas de base de datos en Python utilicen `JOIN`s explícitos con `Customer` para poder segmentar por tienda. El frontend nunca utiliza `merchant_id` de forma directa en su renderizado, por lo cual este cambio es 100% transparente para React si los esquemas de API no lo remueven de los campos de respuesta finales.

---

> [!CAUTION]  
> **Mandato de Actualización:** Cualquier cambio posterior a las entidades del ORM en `backend/src/models/`, scripts de migración de Alembic, rutas de endpoints en `backend/src/api/routes/` o lógica de carga de vistas de Remix (`web/app/routes/`) obliga a la edición inmediata de este archivo para preservar la veracidad del contexto técnico global.
