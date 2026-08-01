# Contexto Arquitectónico y Técnico del Proyecto (Living Document)

> [!IMPORTANT]  
> Este es un documento vivo que contiene la arquitectura, modelo de datos, flujos y reglas del sistema `shopify-credit-app` (**FÍAME APP**). **Cualquier modelo o agente de IA que trabaje en este proyecto debe leer este archivo antes de realizar modificaciones y DEBE mantenerlo actualizado con cualquier cambio relevante en la base de datos, backend o frontend.**

> [!NOTE]  
> **Fuente de verdad del esquema:** los modelos SQLAlchemy en `backend/src/models/` + migraciones Alembic. Prisma (`web/prisma/schema.prisma`) espeja tablas de negocio y además posee `Session` para OAuth de Shopify. Ante conflicto entre este documento y el ORM, prevalece el ORM.

---

## 1. Vista General del Sistema

El sistema es una plataforma de financiamiento y crédito ("Compra ahora, paga después" o "Fiado") integrada con Shopify. Permite a los comercios otorgar créditos sobre pedidos y gestionar sus cuotas, pagos esperados, recordatorios por correo electrónico y aprobaciones de pagos.

### Componentes de la Arquitectura

1. **Frontend de Administración (React Router 7 / Shopify App Bridge / Polaris):**
   * Ubicado en: `web/`
   * App embebida en Shopify Admin (`shopify.app.credit-app-partner.toml`: nombre **FÍAME APP**, handle `opentech-credit-app-test`).
   * Desplegado en: `https://shopify-credit-app-frontend.onrender.com`
   * Administra créditos, clientes, listado de pagos, detalles de transacciones, configuración de pasarelas, notificaciones y envío de recordatorios.
   * Auth Shopify: `authenticate.admin` + sesiones Prisma; puente a JWT del backend vía `web/app/lib/auth.server.ts` (`getAccessTokenForShop` → `POST /api/merchants/register` con `X-Internal-Secret`).

2. **Formulario Público de Reporte de Pago (React / Vite / Material UI):**
   * Ubicado en: `page/`
   * Desplegado en Render como `shopify-credit-app-page` (URL pública de cobro configurada en `PUBLIC_PAGE_URL`, p. ej. `…/pago`).
   * Formulario de cara al cliente final para reportar transacciones bancarias (referencias, montos, notas) a través de un token de acceso seguro de un solo uso.
   * Existe un formulario paralelo en `web/app/routes/pago.tsx`; el despliegue canónico de producción apunta a `page/`.

3. **Backend de Servicios (FastAPI / SQLAlchemy 2 / PostgreSQL / Alembic):**
   * Ubicado en: `backend/`
   * Provee la API REST, autenticación JWT basada en dominios de Shopify, lógica de distribución de cuotas, generación de tokens públicos temporales y envío de correos mediante Resend.
   * Base de datos PostgreSQL alojada en Render (`credit-app-db`), compartida con el frontend (Prisma Session + Alembic business schema).
   * Desplegado en: `https://shopify-credit-app-backend.onrender.com`

### Stack y Deploy (resumen)

| Pieza | Stack | Render |
|-------|--------|--------|
| Admin | React Router 7, Vite, Shopify App Bridge, Prisma Session | `shopify-credit-app-frontend` |
| API | FastAPI, SQLAlchemy, Alembic, PyJWT, Resend | `shopify-credit-app-backend` |
| Público | Vite + React + MUI | `shopify-credit-app-page` (static) |
| DB | PostgreSQL | `credit-app-db` |

Configuración de orquestación: `render.yaml`. Scopes Shopify: `read/write` de `customers`, `orders`, `products`. Metafields de cliente: `document_type`, `document_number`.

---

## 2. Estructura y Modelo de la Base de Datos

El esquema de negocio está en **Tercera Forma Normal (3NF)** tras la migración Alembic correspondiente. Las columnas JSON denormalizadas en `merchants` y los `merchant_id` físicos en `credits`/`payments` **ya no existen** como columnas; se exponen al API como propiedades / DTO para no romper el frontend.

### Enums Globales (`backend/src/models/enums.py`)

1. **`CreditStatus`:** Estado general de un financiamiento.
   * `PENDIENTE_ACTIVACION`
   * `EMITIDO`
   * `EN_PROGRESO`
   * `MOROSO`
   * `PAGADO`
   * `CANCELADO`
2. **`InstallmentStatus`:** Estado individual de una cuota.
   * `PENDIENTE`
   * `PAGADA`
   * `VENCIDA` (canónico para cuotas atrasadas; migrado desde el legado `VENCIDO`)
   * `CANCELADA`
   * `NO_PAGADA`
3. **`PaymentStatus`:** Estado de validación de un pago reportado.
   * `REGISTRADO` (intención de pago vía link / recordatorio)
   * `EN_REVISION`
   * `APROBADO`
   * `RECHAZADO`
   * `CANCELADO`
   * `NO_PAGADA`
4. **`CreditReputation`** (derivada, no columna): `excelente` (≥90), `buena` (≥70), `regular` (≥40), `mala` (&lt;40), o `sin_historial` si `punctuality_score` es `null`. Calculada en `Customer.reputation`.

---

### Mapeo de Tablas e Identidades

#### A. `merchants` (Comercios de Shopify)
* **`id`**: `UUID` (Primary Key).
* **`shop_domain`**: `String` (Único). Dominio del comercio en Shopify.
* **`access_token`**: `String` (Opcional). Token de acceso a la API de Shopify Admin.
* **Relaciones:** `customers`, `payment_settings` (`merchant_payment_settings`).
* *Ya no almacena* columnas JSON `pago_movil_settings`, `transferencia_settings`, etc.

#### A2. `merchant_payment_settings` (Pasarelas normalizadas — 3NF)
* **`id`**: `UUID` (Primary Key).
* **`merchant_id`**: `UUID` (FK → `merchants.id`, Cascade Delete).
* **`method_name`**: `String`. Valores usados: `pago_movil`, `transferencia`, `binance`, `zelle`, `zinli`, `debito`, `general`.
* **`settings_data`**: `JSONB`. Payload del método.
  * Para `pago_movil` / `transferencia` el DTO expuesto usa llaves fijas: `banco`, `telefono`, `numero`, `tipoCi`, `ci`.
  * `general` puede incluir flags como `block_bad_reputation`, `max_credits_per_customer`, `max_total_debt_per_customer`, `silence_notifications`.
* **API:** `GET|PUT /api/merchants/settings` agrega las filas en un objeto plano `{ pago_movil, transferencia, … }` para el frontend.

#### B. `customers` (Clientes asociados a un comercio)
* **`id`**: `Integer` (Primary Key, autoincrement).
* **`merchant_id`**: `UUID` (FK → `merchants.id`).
* **`full_name`**: `String`.
* **`email`**: `String` (Opcional). Correo para recordatorios.
* **`phone`**: `String` (Opcional).
* **`shopify_customer_id`**: `BigInteger` (Opcional, indexado).
* **`favorable_balance`**: `Numeric(12, 2)`. Saldo a favor (overpayment).
* **`punctuality_score`**: `Numeric(5, 2)` (Opcional). Promedio de puntualidad (0.00–100.00).

#### C. `credits` (Financiamientos otorgados)
* **`id`**: `Integer` (Primary Key, autoincrement).
* **`customer_id`**: `Integer` (FK → `customers.id`).
* **`concept`**: `String`. Concepto u orden/factura.
* **`total_amount`**: `Numeric(12, 2)`.
* **`balance`**: `Numeric(12, 2)`. Saldo restante.
* **`installments_count`**: `Integer`. Si es `0`, se considera tipo **Fiado** (sin cuotas).
* **`status`**: `CreditStatus`.
* **`created_at`**: `DateTime`.
* **Sin columna `merchant_id`.** Se obtiene vía `credit.customer.merchant_id` (property `Credit.merchant_id`). Las queries de listado filtran con JOIN a `Customer`.

#### D. `credit_installments` (Cuotas)
* **`id`**: `Integer` (Primary Key, autoincrement).
* **`credit_id`**: `Integer` (FK → `credits.id`, Cascade Delete).
* **`number`**: `Integer`. Índice de la cuota (1, 2, 3…).
* **`amount`**: `Numeric(12, 2)`.
* **`due_date`**: `Date` (Opcional).
* **`status`**: `InstallmentStatus`.
* **`paid_amount`**: `Numeric(12, 2)`.
* **`paid_at`**: `DateTime` (Opcional).

#### E. `credit_items` (Snapshot de productos financiados)
* **`id`**: `Integer` (Primary Key, autoincrement).
* **`credit_id`**: `Integer` (FK → `credits.id`, Cascade Delete).
* **`product_id`**: `String` (ID de Shopify).
* **`product_code`**: `String` (Opcional, SKU).
* **`product_name`**: `String`.
* **`quantity`**: `Integer`.
* **`unit_price`**: `Numeric(12, 2)`.
* *Nota:* Snapshot inmutable para auditoría. `total_price` es property (`unit_price * quantity`), no columna.

#### F. `payments` (Pagos realizados o reportados)
* **`id`**: `Integer` (Primary Key, autoincrement).
* **`credit_id`**: `Integer` (FK → `credits.id`, Cascade Delete).
* **`installment_id`**: `Integer` (FK → `credit_installments.id`, Opcional, Cascade Delete).
* **`amount`**: `Numeric(12, 2)`.
* **`reference_number`**: `String` (no unique global; multitenancy).
* **`payment_method`**: `String` (Opcional).
* **`bank_name`**: `String` (Opcional).
* **`status`**: `PaymentStatus`.
* **`payment_date`**: `DateTime`.
* **`reviewed_at`**: `DateTime` (Opcional).
* **`reviewed_by`**: `UUID` (Opcional; merchant que auditó).
* **`notes`**: `String` (Opcional).
* **`punctuality_value`**: `Numeric(5, 2)` (Opcional; `100` a tiempo, `0` tarde).
* **`created_at` / `updated_at`**: `DateTime`.
* **Sin columnas** `merchant_id` ni `installments_covered`.
  * `Payment.merchant_id` → property vía `credit.customer.merchant_id`.
  * `Payment.installments_covered` → property que concatena IDs de la relación M2M (string tipo `"1,2"`) para el DTO del frontend.
* **Relación M2M:** `covered_installments` vía tabla `payment_installments`.

#### F2. `payment_installments` (M2M pago ↔ cuotas cubiertas)
* **`payment_id`**: `Integer` (PK compuesta, FK → `payments.id`, Cascade).
* **`installment_id`**: `Integer` (PK compuesta, FK → `credit_installments.id`, Cascade).
* Reemplaza la antigua columna string denormalizada; el serializador sigue exponiendo `installments_covered` como texto.

#### G. `payment_tokens` (Enlaces seguros de cobro temporal)
* **`id`**: `UUID` (Primary Key).
* **`token`**: `String` (Único). UUID del enlace.
* **`payment_id`**: `Integer` (FK → `payments.id`, Cascade Delete). Payment intent con estado `REGISTRADO`.
* **`merchant_id`**: `UUID` (FK → `merchants.id`, Cascade Delete).
* **`customer_email`**: `String`.
* **`expires_at`**: `DateTime` (por defecto ~72 horas).
* **`used_at`**: `DateTime` (Opcional).
* **`created_at`**: `DateTime`.

#### H. `payment_proofs` (Comprobantes reportados por clientes)
* **`id`**: `Integer` (Primary Key, autoincrement).
* **`token_id`**: `UUID` (FK → `payment_tokens.id`, Cascade Delete).
* **`reference_number`**: `String`.
* **`bank_name`**: `String`.
* **`amount`**: `Numeric(12, 2)`.
* **`notes`**: `String` (Opcional).
* **`submitted_at`**: `DateTime`.
* **`status`**: `String` (`PENDIENTE` | `REVISADO`).

#### I. `credit_history`
* **`id`**: `Integer` (PK).
* **`credit_id`**: `Integer` (FK → `credits.id`).
* **`event`**: `String`.
* **`description`**: `String` (Opcional).
* **`created_at`**: `DateTime` (timezone, server default).

#### J. `audit_logs`
* **`id`**: `Integer` (PK).
* **`merchant_id`**: `UUID` (Opcional, indexado).
* **`entity_name` / `entity_id` / `action`**: `String`.
* **`timestamp`**: `DateTime`.
* **`changes`**: `JSONB` (Opcional). Snapshot de la entidad.

#### K. `Session` (solo Prisma / frontend)
* Almacena sesiones OAuth de Shopify (`@shopify/shopify-app-session-storage-prisma`). No es modelo SQLAlchemy de negocio.

---

## 3. Autenticación y Superficie API

### Puente Shopify → JWT
1. El layout `web/app/routes/app.tsx` llama `authenticate.admin(request)`.
2. Con el `shop` de la sesión, `getAccessTokenForShop(shop)` hace `POST /api/merchants/register` con header `X-Internal-Secret`.
3. El backend crea o recupera el `Merchant` y responde `access_token` (JWT HS256, `sub` = UUID del merchant) + cookie HttpOnly `refresh_token`.
4. Las llamadas posteriores al API usan `Authorization: Bearer <access_token>`.
5. Cache in-memory del JWT por shop (~23h) en el proceso Node del admin.

Endpoints públicos (`/api/public/*`) **no** usan JWT de merchant; se autentican con el token de pago de un solo uso.

### Routers montados en `backend/src/main.py` (prefijo `/api`)

| Router | Prefijo / área | Endpoints clave |
|--------|----------------|-----------------|
| `credits` | `/credits` | `POST ""`, `GET ""`, `GET /{id}`, `GET /payments/by-credit/{id}`, `PUT /{id}`, `PUT /{id}/cancel` |
| `customer` | `/customers` | CRUD, sync Shopify, ajuste/reset de `favorable_balance` |
| `payments` | `/payments` | create, list, `PATCH /{id}/review`, batch review/delete, `GET /expected`, `POST /payment-tokens`, payment-proofs |
| `dashboard` | `/dashboard` | Resumen de deuda |
| `merchant` | `/merchants` | `POST /register`, `POST /refresh`, `GET|PUT /settings` |
| `public` | `/public` | `GET /payment-info`, `POST /payment-proof`, stubs GDPR webhooks |
| `audit` | `/audit` | login, notifications, balance-history |
| `admin` | `/morosity` | `POST /run` (interno / cron) |

### No montado (gap conocido)
* ~~`backend/src/api/routes/admin.py` → morosidad~~ **Resuelto:** montado como `POST /api/morosity/run` (header `X-Internal-Secret`) y cron diario en Render.

### Rutas admin Shopify relevantes (`web/app/routes/`)

| Ruta | Archivo | Rol |
|------|---------|-----|
| `/app` | `app._index.tsx` | Dashboard |
| `/app/shopify_customers` | `app.shopify_customers.tsx` | Clientes + sync |
| `/app/customer_detail/:id` | `app.customer_detail.$id.tsx` | Detalle / saldo a favor |
| `/app/credits` | `app.credits.tsx` | Listado / cancelar |
| `/app/registre_credit` | `app.registre_credit.tsx` | Alta crédito (+ GraphQL productos) |
| `/app/credit_detail/:id` | `app.credit_detail.$id.tsx` | Detalle / recordatorios |
| `/app/payments` | `app.payments.tsx` | Pagos + proofs |
| `/app/payment_detail/:id` | `app.payment_detail.$id.tsx` | Aprobar / rechazar |
| `/app/expected_payments` | `app.expected_payments.tsx` | Cuotas esperadas + email |
| `/app/registre_payment` | `app.registre_payment.tsx` | Registro manual |
| `/app/settings` | `app.settings.tsx` | Pasarelas |
| `/app/notifications` | `app.notifications.tsx` | Campana de notificaciones |
| `/pago` | `pago.tsx` | Formulario token (paralelo a `page/`) |

---

## 4. Trazabilidad del Flujo de Datos (End-to-End)

### Flujo 1: Emisión de Crédito
1. El **Merchant** crea un crédito desde el panel (`app.registre_credit.tsx`), opcionalmente resolviendo clientes/productos vía Admin GraphQL.
2. El admin hace `POST /api/credits`.
3. El backend puede bloquear la emisión si `general.block_bad_reputation` y la reputación del cliente es `mala`, o si se exceden `max_credits_per_customer` / `max_total_debt_per_customer`.
4. Se insertan `Credit`, `CreditInstallment`(s) y `CreditItem`(s).
5. La UI refleja el crédito en listados y detalle.

### Flujo 2: Envío de Recordatorio
1. El **Merchant** pulsa "Enviar Recordatorio" (pagos esperados o detalle de crédito).
2. Admin → `POST /api/payments/payment-tokens`.
3. Backend crea `Payment` (`REGISTRADO`) + `PaymentToken` temporal.
4. Backend envía email vía **Resend** con el enlace (`PUBLIC_PAGE_URL` + token).
5. El frontend marca el envío como realizado de forma persistente en la UI.

### Flujo 3: Reporte Público de Pago
1. El **Cliente** abre la URL pública con el token.
2. Formulario → `GET /api/public/payment-info?token=XYZ` (tienda, productos, deuda, settings de pasarela).
3. Cliente envía comprobante → `POST /api/public/payment-proof`.
4. Backend: `Payment` → `EN_REVISION`, inserta `payment_proofs`, marca token usado.
5. Se genera notificación de auditoría para el merchant.

### Flujo 4: Auditoría e Impacto de Saldos
1. Merchant revisa en `app.payment_detail.$id.tsx`.
2. `PATCH /api/payments/{id}/review` con `APROBADO` o `RECHAZADO`.
3. Si **APROBADO**:
   * Descuenta `credit.balance`.
   * Distribuye entre cuotas (`_apply_payment_distribution` en `backend/src/crud/payment.py`).
   * Calcula `punctuality_value` y actualiza `customer.punctuality_score`.
   * Excedente → `favorable_balance`.
   * Persiste cobertura en `payment_installments`.
4. Si **RECHAZADO** (y antes estaba aprobado): reversión matemática (ver §5.B).
5. Eventos en `audit_logs` / `credit_history`.

---

## 5. Reglas de Negocio Clave y Algoritmos Complejos

### A. Algoritmo de Distribución de Pagos (`_apply_payment_distribution`)
Cuando un pago se marca como `APROBADO` (o se aplica desde saldo a favor), el backend distribuye así:
1. **Determinar monto a aplicar:**
   * **Fiado** (`installments_count = 0`): el pago se limita al `balance`; exceso → `favorable_balance`.
   * Con cuotas **sin** `distribute_excess`: solo cuotas en `target_installment_ids`; sobrante → `favorable_balance`.
   * Con `distribute_excess`: el sobrante cascada sobre cuotas pendientes ordenadas por `due_date` ASC.
2. **Actualización de cuotas:**
   * Si el remanente ≥ deuda de la cuota (epsilon `0.01`) → `PAGADA`, set `paid_at`, descuenta remanente.
   * Si no cubre → pago parcial; remanente a `0`.
3. **Puntualidad:**
   * Sin valor manual: compara `payment_date` vs `due_date` más temprana del grupo cubierto.
   * A tiempo → `punctuality_value = 100`; tarde → `0`.
   * Se promedian en `customer.punctuality_score` → reputación.

### B. Lógica de Reversión (`review_payment` con RECHAZADO)
Si un pago previamente `APROBADO` pasa a `RECHAZADO`:
1. Cuotas en `covered_installments` / `installments_covered` → `PENDIENTE`.
2. `paid_amount = 0`, limpia `paid_at`.
3. Restaura `credit.balance`.
4. Deduce `favorable_balance` si el pago generó exceso (sin dejar negativo).
5. Si el crédito estaba `PAGADO` → `EN_PROGRESO`.
6. Recalcula `punctuality_score` excluyendo la transacción.

### C. Morosidad (`services/morosity.py`)
* Cuotas `PENDIENTE` con `due_date < today` → `VENCIDA`.
* Créditos afectados → `MOROSO`.
* **Operativo vía:** `POST /api/morosity/run` (protegido) y cron Render `shopify-credit-app-morosity` → `backend/scripts/run_morosity.py`.

---

## 6. Mantenimiento y Reglas de Consistencia (Contrato DTO)

El backend **ya está en 3NF**. El contrato HTTP hacia React **debe** seguir siendo estable:

1. **`GET|PUT /api/merchants/settings`:**
   * Respuesta plana: `{ pago_movil, transferencia, binance, zelle, zinli, debito, general }`.
   * Persistencia real: filas en `merchant_payment_settings`. El router ya hace el map `method_name → settings_data`.

2. **`/api/payments` y detalles:**
   * Campo string `installments_covered` (ej. `"1,2"`) en el DTO.
   * Persistencia real: `payment_installments` + property/`serializer` que concatena.

3. **Filtros por merchant:**
   * `credits` y `payments` no tienen columna `merchant_id`; las queries usan JOIN con `Customer` (y properties en modelos).
   * Los esquemas de respuesta pueden seguir exponiendo `merchant_id` derivado; el frontend no debe depender de una columna física.

4. **Al cambiar ORM / Alembic / routes / loaders:**
   * Actualizar **este archivo** de inmediato.

---

## 7. Gaps y Deuda Técnica Conocida

| Área | Estado |
|------|--------|
| Webhooks Shopify (`app/uninstalled`, `app/scopes_update`) | Handlers en `web/app/routes/webhooks.app.*.tsx` (borran/actualizan `Session`) |
| Job de morosidad | `POST /api/morosity/run` (secret interno) + cron Render `shopify-credit-app-morosity` (`scripts/run_morosity.py`) · enum canónico `VENCIDA` |
| Formulario público duplicado | `page/` (canónico Render) vs `web/.../pago.tsx` |
| Secret interno | `INTERNAL_AUTH_SECRET` debe venir de env; hay fallback hardcodeado en `auth.server.ts` (evitar en prod) |
| Workers | Dependencias Celery/Redis/Twilio presentes; `tasks/worker.py` vacío |
| API version Shopify | TOML webhooks `2026-04` vs código `ApiVersion.October25` — mantener alineados |
| Extensions | Carpeta `extensions/` vacía |

---

> [!CAUTION]  
> **Mandato de Actualización:** Cualquier cambio posterior a las entidades del ORM en `backend/src/models/`, scripts de migración de Alembic, rutas de endpoints en `backend/src/api/routes/` o lógica de carga de vistas del admin (`web/app/routes/`) obliga a la edición inmediata de este archivo para preservar la veracidad del contexto técnico global.
