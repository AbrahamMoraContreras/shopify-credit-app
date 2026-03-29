--
-- PostgreSQL database dump
--

\restrict lbM8Q9s72FC5Er7faKJEiDMswIvOGCOQ9lLOccONYI22HlrViF5Sarm72ps9gMy

-- Dumped from database version 18.1
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

ALTER TABLE IF EXISTS ONLY public.payments DROP CONSTRAINT IF EXISTS payments_installment_id_fkey;
ALTER TABLE IF EXISTS ONLY public.payments DROP CONSTRAINT IF EXISTS payments_credit_id_fkey;
ALTER TABLE IF EXISTS ONLY public.payment_tokens DROP CONSTRAINT IF EXISTS payment_tokens_payment_id_fkey;
ALTER TABLE IF EXISTS ONLY public.payment_tokens DROP CONSTRAINT IF EXISTS payment_tokens_merchant_id_fkey;
ALTER TABLE IF EXISTS ONLY public.payment_proofs DROP CONSTRAINT IF EXISTS payment_proofs_token_id_fkey;
ALTER TABLE IF EXISTS ONLY public.customers DROP CONSTRAINT IF EXISTS customers_merchant_id_fkey;
ALTER TABLE IF EXISTS ONLY public.credits DROP CONSTRAINT IF EXISTS credits_merchant_id_fkey;
ALTER TABLE IF EXISTS ONLY public.credits DROP CONSTRAINT IF EXISTS credits_customer_id_fkey;
ALTER TABLE IF EXISTS ONLY public.credit_items DROP CONSTRAINT IF EXISTS credit_items_credit_id_fkey;
ALTER TABLE IF EXISTS ONLY public.credit_installments DROP CONSTRAINT IF EXISTS credit_installments_credit_id_fkey;
ALTER TABLE IF EXISTS ONLY public.credit_history DROP CONSTRAINT IF EXISTS credit_history_credit_id_fkey;
DROP INDEX IF EXISTS public.ix_payments_id;
DROP INDEX IF EXISTS public.ix_customers_shopify_customer_id;
DROP INDEX IF EXISTS public.ix_customers_merchant_id;
DROP INDEX IF EXISTS public.ix_customers_id;
DROP INDEX IF EXISTS public.ix_credits_merchant_id;
DROP INDEX IF EXISTS public.ix_credits_id;
DROP INDEX IF EXISTS public.ix_credits_customer_id;
DROP INDEX IF EXISTS public.ix_credit_items_product_id;
DROP INDEX IF EXISTS public.ix_credit_items_id;
DROP INDEX IF EXISTS public.ix_credit_installments_id;
DROP INDEX IF EXISTS public.ix_credit_history_id;
DROP INDEX IF EXISTS public.ix_audit_logs_entity_name;
DROP INDEX IF EXISTS public.ix_audit_logs_entity_id;
DROP INDEX IF EXISTS public.ix_audit_logs_action;
DROP INDEX IF EXISTS public.idx_dashboard_metrics_mv_refreshed;
DROP INDEX IF EXISTS public.idx_dashboard_metrics_mv_merchant;
ALTER TABLE IF EXISTS ONLY public.payments DROP CONSTRAINT IF EXISTS uq_payment_reference;
ALTER TABLE IF EXISTS ONLY public.payments DROP CONSTRAINT IF EXISTS payments_pkey;
ALTER TABLE IF EXISTS ONLY public.payment_tokens DROP CONSTRAINT IF EXISTS payment_tokens_token_key;
ALTER TABLE IF EXISTS ONLY public.payment_tokens DROP CONSTRAINT IF EXISTS payment_tokens_pkey;
ALTER TABLE IF EXISTS ONLY public.payment_proofs DROP CONSTRAINT IF EXISTS payment_proofs_pkey;
ALTER TABLE IF EXISTS ONLY public.merchants DROP CONSTRAINT IF EXISTS merchants_shop_domain_key;
ALTER TABLE IF EXISTS ONLY public.merchants DROP CONSTRAINT IF EXISTS merchants_pkey;
ALTER TABLE IF EXISTS ONLY public.customers DROP CONSTRAINT IF EXISTS customers_pkey;
ALTER TABLE IF EXISTS ONLY public.credits DROP CONSTRAINT IF EXISTS credits_pkey;
ALTER TABLE IF EXISTS ONLY public.credit_items DROP CONSTRAINT IF EXISTS credit_items_pkey;
ALTER TABLE IF EXISTS ONLY public.credit_installments DROP CONSTRAINT IF EXISTS credit_installments_pkey;
ALTER TABLE IF EXISTS ONLY public.credit_history DROP CONSTRAINT IF EXISTS credit_history_pkey;
ALTER TABLE IF EXISTS ONLY public.audit_logs DROP CONSTRAINT IF EXISTS audit_logs_pkey;
ALTER TABLE IF EXISTS ONLY public.alembic_version DROP CONSTRAINT IF EXISTS alembic_version_pkc;
ALTER TABLE IF EXISTS ONLY public."Session" DROP CONSTRAINT IF EXISTS "Session_pkey";
ALTER TABLE IF EXISTS public.payments ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.payment_proofs ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.customers ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.credits ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.credit_items ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.credit_installments ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.credit_history ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.audit_logs ALTER COLUMN id DROP DEFAULT;
DROP SEQUENCE IF EXISTS public.payments_id_seq;
DROP TABLE IF EXISTS public.payment_tokens;
DROP SEQUENCE IF EXISTS public.payment_proofs_id_seq;
DROP TABLE IF EXISTS public.payment_proofs;
DROP TABLE IF EXISTS public.merchants;
DROP MATERIALIZED VIEW IF EXISTS public.dashboard_metrics_mv;
DROP TABLE IF EXISTS public.payments;
DROP SEQUENCE IF EXISTS public.customers_id_seq;
DROP TABLE IF EXISTS public.customers;
DROP SEQUENCE IF EXISTS public.credits_id_seq;
DROP TABLE IF EXISTS public.credits;
DROP SEQUENCE IF EXISTS public.credit_items_id_seq;
DROP TABLE IF EXISTS public.credit_items;
DROP SEQUENCE IF EXISTS public.credit_installments_id_seq;
DROP TABLE IF EXISTS public.credit_installments;
DROP SEQUENCE IF EXISTS public.credit_history_id_seq;
DROP TABLE IF EXISTS public.credit_history;
DROP SEQUENCE IF EXISTS public.audit_logs_id_seq;
DROP TABLE IF EXISTS public.audit_logs;
DROP TABLE IF EXISTS public.alembic_version;
DROP TABLE IF EXISTS public."Session";
DROP TYPE IF EXISTS public.paymentstatus;
DROP TYPE IF EXISTS public.installmentstatus;
DROP TYPE IF EXISTS public.creditstatus;
DROP TYPE IF EXISTS public.creditreputation;
-- *not* dropping schema, since initdb creates it
--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

-- *not* creating schema, since initdb creates it


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS '';


--
-- Name: creditreputation; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.creditreputation AS ENUM (
    'EXCELENTE',
    'BUENA',
    'REGULAR',
    'MALA'
);


--
-- Name: creditstatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.creditstatus AS ENUM (
    'PENDIENTE_ACTIVACION',
    'EMITIDO',
    'EN_PROGRESO',
    'MOROSO',
    'PAGADO',
    'CANCELADO'
);


--
-- Name: installmentstatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.installmentstatus AS ENUM (
    'PENDIENTE',
    'PAGADA',
    'VENCIDA',
    'VENCIDO'
);


--
-- Name: paymentstatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.paymentstatus AS ENUM (
    'EN_REVISION',
    'APROBADO',
    'RECHAZADO',
    'REGISTRADO',
    'CANCELADO'
);


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: Session; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Session" (
    id text NOT NULL,
    shop character varying NOT NULL,
    state character varying NOT NULL,
    "isOnline" boolean DEFAULT false NOT NULL,
    scope character varying,
    expires timestamp(6) without time zone,
    "accessToken" character varying NOT NULL,
    "userId" bigint,
    "firstName" character varying,
    "lastName" character varying,
    email character varying,
    "accountOwner" boolean DEFAULT false NOT NULL,
    locale character varying,
    collaborator boolean DEFAULT false,
    "emailVerified" boolean DEFAULT false,
    "refreshToken" character varying,
    "refreshTokenExpires" timestamp(6) without time zone
);


--
-- Name: alembic_version; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.alembic_version (
    version_num character varying(32) NOT NULL
);


--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_logs (
    id integer NOT NULL,
    entity_name character varying NOT NULL,
    entity_id character varying NOT NULL,
    action character varying NOT NULL,
    "timestamp" timestamp without time zone NOT NULL,
    changes jsonb
);


--
-- Name: audit_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.audit_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: audit_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.audit_logs_id_seq OWNED BY public.audit_logs.id;


--
-- Name: credit_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.credit_history (
    id integer NOT NULL,
    credit_id integer NOT NULL,
    event character varying NOT NULL,
    description character varying,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: credit_history_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.credit_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: credit_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.credit_history_id_seq OWNED BY public.credit_history.id;


--
-- Name: credit_installments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.credit_installments (
    id integer NOT NULL,
    credit_id integer NOT NULL,
    amount numeric(12,2) NOT NULL,
    due_date date,
    number integer DEFAULT 1 NOT NULL,
    status public.installmentstatus DEFAULT 'PENDIENTE'::public.installmentstatus NOT NULL,
    paid_amount numeric(12,2) DEFAULT 0 NOT NULL,
    paid_at timestamp without time zone
);


--
-- Name: credit_installments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.credit_installments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: credit_installments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.credit_installments_id_seq OWNED BY public.credit_installments.id;


--
-- Name: credit_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.credit_items (
    id integer NOT NULL,
    credit_id integer NOT NULL,
    product_id character varying NOT NULL,
    product_code character varying,
    product_name character varying NOT NULL,
    quantity integer NOT NULL,
    unit_price numeric(12,2) NOT NULL
);


--
-- Name: COLUMN credit_items.product_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.credit_items.product_id IS 'Shopify Product ID';


--
-- Name: COLUMN credit_items.product_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.credit_items.product_code IS 'SKU del producto';


--
-- Name: credit_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.credit_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: credit_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.credit_items_id_seq OWNED BY public.credit_items.id;


--
-- Name: credits; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.credits (
    id integer NOT NULL,
    customer_id integer NOT NULL,
    concept character varying NOT NULL,
    total_amount numeric(12,2) NOT NULL,
    balance numeric(12,2) NOT NULL,
    status public.creditstatus NOT NULL,
    merchant_id uuid NOT NULL,
    installments_count integer NOT NULL,
    created_at timestamp without time zone
);


--
-- Name: credits_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.credits_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: credits_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.credits_id_seq OWNED BY public.credits.id;


--
-- Name: customers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customers (
    id integer NOT NULL,
    full_name character varying NOT NULL,
    merchant_id uuid NOT NULL,
    shopify_customer_id bigint,
    favorable_balance numeric(12,2) NOT NULL,
    punctuality_score numeric(5,2),
    email character varying,
    phone character varying
);


--
-- Name: customers_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.customers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: customers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.customers_id_seq OWNED BY public.customers.id;


--
-- Name: payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payments (
    id integer NOT NULL,
    credit_id integer NOT NULL,
    installment_id integer,
    amount numeric(12,2) NOT NULL,
    reference_number character varying NOT NULL,
    payment_date timestamp without time zone,
    created_at timestamp without time zone DEFAULT now(),
    payment_method character varying,
    merchant_id uuid NOT NULL,
    status public.paymentstatus DEFAULT 'EN_REVISION'::public.paymentstatus NOT NULL,
    reviewed_at timestamp without time zone,
    reviewed_by uuid,
    notes character varying,
    updated_at timestamp without time zone DEFAULT now(),
    punctuality_value numeric(5,2),
    installments_covered character varying
);


--
-- Name: dashboard_metrics_mv; Type: MATERIALIZED VIEW; Schema: public; Owner: -
--

CREATE MATERIALIZED VIEW public.dashboard_metrics_mv AS
 WITH base_credits AS (
         SELECT c.id,
            c.merchant_id,
            c.customer_id,
            c.total_amount,
            c.balance,
            c.status
           FROM public.credits c
        ), installments_stats AS (
         SELECT ci.credit_id,
            count(*) FILTER (WHERE ((ci.due_date < CURRENT_DATE) AND (ci.status <> 'PAGADA'::public.installmentstatus))) AS overdue_installments,
            sum(ci.amount) FILTER (WHERE ((ci.due_date < CURRENT_DATE) AND (ci.status <> 'PAGADA'::public.installmentstatus))) AS overdue_amount
           FROM public.credit_installments ci
          GROUP BY ci.credit_id
        ), payments_stats AS (
         SELECT p.credit_id,
            sum(p.amount) AS total_paid
           FROM public.payments p
          WHERE (p.status = 'APROBADO'::public.paymentstatus)
          GROUP BY p.credit_id
        )
 SELECT bc.merchant_id,
    count(bc.id) AS total_credits,
    count(bc.id) FILTER (WHERE (bc.status = 'EN_PROGRESO'::public.creditstatus)) AS active_credits,
    count(bc.id) FILTER (WHERE (ist.overdue_installments > 0)) AS morose_credits,
    count(DISTINCT bc.customer_id) FILTER (WHERE (ist.overdue_installments > 0)) AS customers_in_mora,
    sum(bc.total_amount) AS total_emitted,
    sum(bc.balance) AS total_pending,
    COALESCE(sum(ps.total_paid), (0)::numeric) AS total_collected,
    COALESCE(sum(ist.overdue_amount), (0)::numeric) AS overdue_amount,
    CURRENT_TIMESTAMP AS refreshed_at
   FROM ((base_credits bc
     LEFT JOIN installments_stats ist ON ((ist.credit_id = bc.id)))
     LEFT JOIN payments_stats ps ON ((ps.credit_id = bc.id)))
  GROUP BY bc.merchant_id
  WITH NO DATA;


--
-- Name: merchants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.merchants (
    id uuid NOT NULL,
    shop_domain character varying CONSTRAINT merchants_shop_domain_not_null1 NOT NULL,
    access_token character varying,
    pago_movil_settings jsonb,
    transferencia_settings jsonb
);


--
-- Name: payment_proofs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payment_proofs (
    id integer NOT NULL,
    token_id uuid NOT NULL,
    reference_number character varying NOT NULL,
    bank_name character varying NOT NULL,
    amount numeric(12,2) NOT NULL,
    notes character varying,
    submitted_at timestamp without time zone,
    status character varying NOT NULL
);


--
-- Name: payment_proofs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.payment_proofs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: payment_proofs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.payment_proofs_id_seq OWNED BY public.payment_proofs.id;


--
-- Name: payment_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payment_tokens (
    id uuid NOT NULL,
    token character varying NOT NULL,
    payment_id integer NOT NULL,
    merchant_id uuid NOT NULL,
    customer_email character varying NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    used_at timestamp without time zone,
    created_at timestamp without time zone
);


--
-- Name: payments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.payments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: payments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.payments_id_seq OWNED BY public.payments.id;


--
-- Name: audit_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs ALTER COLUMN id SET DEFAULT nextval('public.audit_logs_id_seq'::regclass);


--
-- Name: credit_history id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.credit_history ALTER COLUMN id SET DEFAULT nextval('public.credit_history_id_seq'::regclass);


--
-- Name: credit_installments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.credit_installments ALTER COLUMN id SET DEFAULT nextval('public.credit_installments_id_seq'::regclass);


--
-- Name: credit_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.credit_items ALTER COLUMN id SET DEFAULT nextval('public.credit_items_id_seq'::regclass);


--
-- Name: credits id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.credits ALTER COLUMN id SET DEFAULT nextval('public.credits_id_seq'::regclass);


--
-- Name: customers id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customers ALTER COLUMN id SET DEFAULT nextval('public.customers_id_seq'::regclass);


--
-- Name: payment_proofs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_proofs ALTER COLUMN id SET DEFAULT nextval('public.payment_proofs_id_seq'::regclass);


--
-- Name: payments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments ALTER COLUMN id SET DEFAULT nextval('public.payments_id_seq'::regclass);


--
-- Data for Name: Session; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Session" (id, shop, state, "isOnline", scope, expires, "accessToken", "userId", "firstName", "lastName", email, "accountOwner", locale, collaborator, "emailVerified", "refreshToken", "refreshTokenExpires") FROM stdin;
offline_opentech-credit-app-test.myshopify.com	opentech-credit-app-test.myshopify.com		f	write_customers,write_orders,write_products	2026-03-28 01:51:31.234	shpua_4302d69f29f0b861273450c0837a0af3	\N	\N	\N	\N	f	\N	f	f	shprt_93f75e7de03d7188931fb4bed72e289d	2026-06-26 00:51:31.234
\.


--
-- Data for Name: alembic_version; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.alembic_version (version_num) FROM stdin;
5f8c42f5ac20
\.


--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.audit_logs (id, entity_name, entity_id, action, "timestamp", changes) FROM stdin;
1	Payment	54	DELETE	2026-03-12 23:32:34.939796	{"id": 54, "notes": "Automatic reversal due to deletion", "amount": 1000.0, "status": "RECHAZADO", "credit_id": 93, "created_at": "2026-03-10T21:21:46.900481", "updated_at": "2026-03-10T21:21:46.900481", "merchant_id": "c4625125-3722-490c-94e0-008f00dc6e9a", "reviewed_at": "2026-03-12T23:27:52.202090", "reviewed_by": "c4625125-3722-490c-94e0-008f00dc6e9a", "payment_date": "2026-03-10T21:21:46.898283", "installment_id": null, "payment_method": "BANK", "reference_number": "REF-1773177706847", "punctuality_value": null, "installments_covered": null}
2	Credit	93	DELETE	2026-03-12 23:32:35.204276	{"id": 93, "status": "EN_PROGRESO", "balance": 2629.95, "concept": "The Draft Snowboard (x1)", "created_at": "2026-03-10T21:21:06.017884", "customer_id": 8, "merchant_id": "c4625125-3722-490c-94e0-008f00dc6e9a", "total_amount": 2629.95, "installments_count": 0}
3	Payment	55	DELETE	2026-03-12 23:32:37.98523	{"id": 55, "notes": "[DISTRIBUTE_EXCESS]", "amount": 10.0, "status": "EN_REVISION", "credit_id": 92, "created_at": "2026-03-12T17:51:29.415458", "updated_at": "2026-03-12T17:51:29.415458", "merchant_id": "c4625125-3722-490c-94e0-008f00dc6e9a", "reviewed_at": null, "reviewed_by": null, "payment_date": "2026-03-12T17:51:29.413713", "installment_id": null, "payment_method": "BANK", "reference_number": "EFECTIVO-1773337889385", "punctuality_value": null, "installments_covered": null}
4	Credit	92	DELETE	2026-03-12 23:32:37.988184	{"id": 92, "status": "EMITIDO", "balance": 1025.0, "concept": "The Collection Snowboard: Oxygen (x1)", "created_at": "2026-03-10T16:11:14.491722", "customer_id": 9, "merchant_id": "c4625125-3722-490c-94e0-008f00dc6e9a", "total_amount": 1025.0, "installments_count": 0}
5	Payment	49	DELETE	2026-03-12 23:32:39.787644	{"id": 49, "notes": "[DISTRIBUTE_EXCESS]", "amount": 500.0, "status": "EN_REVISION", "credit_id": 91, "created_at": "2026-03-10T04:48:33.667627", "updated_at": "2026-03-10T04:48:33.667627", "merchant_id": "c4625125-3722-490c-94e0-008f00dc6e9a", "reviewed_at": null, "reviewed_by": null, "payment_date": "2026-03-10T04:48:33.664852", "installment_id": null, "payment_method": "BANK", "reference_number": "REF-1773118113649", "punctuality_value": null, "installments_covered": "110,111"}
6	Payment	50	DELETE	2026-03-12 23:32:39.78964	{"id": 50, "notes": "[DISTRIBUTE_EXCESS]", "amount": 500.0, "status": "EN_REVISION", "credit_id": 91, "created_at": "2026-03-10T04:49:44.353497", "updated_at": "2026-03-10T04:49:44.353497", "merchant_id": "c4625125-3722-490c-94e0-008f00dc6e9a", "reviewed_at": null, "reviewed_by": null, "payment_date": "2026-03-10T04:49:44.351891", "installment_id": null, "payment_method": "BANK", "reference_number": "REF-1773118184341", "punctuality_value": null, "installments_covered": "110,111"}
7	Payment	51	DELETE	2026-03-12 23:32:39.790636	{"id": 51, "notes": "Automatic reversal due to deletion", "amount": 500.0, "status": "RECHAZADO", "credit_id": 91, "created_at": "2026-03-10T04:50:33.830595", "updated_at": "2026-03-10T04:50:33.830595", "merchant_id": "c4625125-3722-490c-94e0-008f00dc6e9a", "reviewed_at": "2026-03-10T05:03:33.975015", "reviewed_by": "c4625125-3722-490c-94e0-008f00dc6e9a", "payment_date": "2026-03-10T04:50:33.829596", "installment_id": null, "payment_method": "BANK", "reference_number": "REF-1773118233818", "punctuality_value": null, "installments_covered": "110,111,112"}
8	Payment	52	DELETE	2026-03-12 23:32:39.801606	{"id": 52, "notes": "[DISTRIBUTE_EXCESS]", "amount": 500.0, "status": "APROBADO", "credit_id": 91, "created_at": "2026-03-10T05:04:05.086064", "updated_at": "2026-03-10T05:04:05.086064", "merchant_id": "c4625125-3722-490c-94e0-008f00dc6e9a", "reviewed_at": "2026-03-10T05:04:05.396790", "reviewed_by": "c4625125-3722-490c-94e0-008f00dc6e9a", "payment_date": "2026-03-10T05:04:05.083071", "installment_id": null, "payment_method": "BANK", "reference_number": "REF-1773119045013", "punctuality_value": null, "installments_covered": "110,111"}
9	Payment	53	DELETE	2026-03-12 23:32:39.802603	{"id": 53, "notes": "[DISTRIBUTE_EXCESS]", "amount": 100.0, "status": "APROBADO", "credit_id": 91, "created_at": "2026-03-10T14:09:36.965236", "updated_at": "2026-03-10T14:09:36.965236", "merchant_id": "c4625125-3722-490c-94e0-008f00dc6e9a", "reviewed_at": "2026-03-10T14:09:37.260959", "reviewed_by": "c4625125-3722-490c-94e0-008f00dc6e9a", "payment_date": "2026-03-10T14:09:36.962503", "installment_id": null, "payment_method": "BANK", "reference_number": "REF-1773151776948", "punctuality_value": null, "installments_covered": "112"}
10	Credit	91	DELETE	2026-03-12 23:32:39.807591	{"id": 91, "status": "PAGADO", "balance": 0.0, "concept": "The Collection Snowboard: Hydrogen (x1)", "created_at": "2026-03-10T04:47:48.267926", "customer_id": 8, "merchant_id": "c4625125-3722-490c-94e0-008f00dc6e9a", "total_amount": 600.0, "installments_count": 3}
11	Credit	94	CREATE	2026-03-12 23:34:01.503054	{"id": 94, "status": "EMITIDO", "balance": 600.0, "concept": "The Collection Snowboard: Hydrogen (x1)", "created_at": "2026-03-12T23:34:01.406994", "customer_id": 9, "merchant_id": "c4625125-3722-490c-94e0-008f00dc6e9a", "total_amount": 600.0, "installments_count": 0}
12	Payment	56	CREATE	2026-03-12 23:36:46.475964	{"id": 56, "notes": "Intención de pago generada vía link de cobro", "amount": 600.0, "status": "REGISTRADO", "credit_id": 94, "created_at": "2026-03-12T23:36:46.319508", "updated_at": "2026-03-12T23:36:46.319508", "merchant_id": "c4625125-3722-490c-94e0-008f00dc6e9a", "reviewed_at": null, "reviewed_by": null, "payment_date": "2026-03-12T23:36:46.316517", "installment_id": null, "payment_method": "Link de Pago", "reference_number": "INTENT-E56EE3BD", "punctuality_value": null, "installments_covered": null}
13	Credit	95	CREATE	2026-03-12 23:37:36.711778	{"id": 95, "status": "EMITIDO", "balance": 600.0, "concept": "The Collection Snowboard: Hydrogen (x1)", "created_at": "2026-03-12T23:37:36.708786", "customer_id": 8, "merchant_id": "c4625125-3722-490c-94e0-008f00dc6e9a", "total_amount": 600.0, "installments_count": 0}
14	Payment	56	DELETE	2026-03-12 23:37:42.502795	{"id": 56, "notes": "Intención de pago generada vía link de cobro", "amount": 600.0, "status": "REGISTRADO", "credit_id": 94, "created_at": "2026-03-12T23:36:46.319508", "updated_at": "2026-03-12T23:36:46.319508", "merchant_id": "c4625125-3722-490c-94e0-008f00dc6e9a", "reviewed_at": null, "reviewed_by": null, "payment_date": "2026-03-12T23:36:46.316517", "installment_id": null, "payment_method": "Link de Pago", "reference_number": "INTENT-E56EE3BD", "punctuality_value": null, "installments_covered": null}
15	Credit	94	DELETE	2026-03-12 23:37:42.504753	{"id": 94, "status": "EMITIDO", "balance": 600.0, "concept": "The Collection Snowboard: Hydrogen (x1)", "created_at": "2026-03-12T23:34:01.406994", "customer_id": 9, "merchant_id": "c4625125-3722-490c-94e0-008f00dc6e9a", "total_amount": 600.0, "installments_count": 0}
16	Payment	57	CREATE	2026-03-12 23:37:46.056091	{"id": 57, "notes": "Intención de pago generada vía link de cobro", "amount": 600.0, "status": "REGISTRADO", "credit_id": 95, "created_at": "2026-03-12T23:37:46.054099", "updated_at": "2026-03-12T23:37:46.054099", "merchant_id": "c4625125-3722-490c-94e0-008f00dc6e9a", "reviewed_at": null, "reviewed_by": null, "payment_date": "2026-03-12T23:37:46.054099", "installment_id": null, "payment_method": "Link de Pago", "reference_number": "INTENT-CC7F9A9D", "punctuality_value": null, "installments_covered": null}
17	Credit	96	CREATE	2026-03-12 23:42:10.25809	{"id": 96, "status": "EMITIDO", "balance": 785.95, "concept": "The Compare at Price Snowboard (x1)", "created_at": "2026-03-12T23:42:10.256096", "customer_id": 7, "merchant_id": "c4625125-3722-490c-94e0-008f00dc6e9a", "total_amount": 785.95, "installments_count": 2}
18	Credit	96	DELETE	2026-03-12 23:48:26.001342	{"id": 96, "status": "EMITIDO", "balance": 785.95, "concept": "The Compare at Price Snowboard (x1)", "created_at": "2026-03-12T23:42:10.256096", "customer_id": 7, "merchant_id": "c4625125-3722-490c-94e0-008f00dc6e9a", "total_amount": 785.95, "installments_count": 2}
19	Payment	57	DELETE	2026-03-12 23:48:28.091749	{"id": 57, "notes": "Doc: V-94666317 | Cuenta: 01022222222252335423 | Extra: pago", "amount": 600.0, "status": "APROBADO", "credit_id": 95, "created_at": "2026-03-12T23:37:46.054099", "updated_at": "2026-03-12T23:38:24.429121", "merchant_id": "c4625125-3722-490c-94e0-008f00dc6e9a", "reviewed_at": "2026-03-12T23:40:12.990511", "reviewed_by": "c4625125-3722-490c-94e0-008f00dc6e9a", "payment_date": "2026-03-12T23:37:46.054099", "installment_id": null, "payment_method": "(0115) BANCO EXTERIOR C.A., BANCO UNIVERSAL", "reference_number": "1231313253125", "punctuality_value": null, "installments_covered": null}
20	Credit	95	DELETE	2026-03-12 23:48:28.094741	{"id": 95, "status": "EN_PROGRESO", "balance": 600.0, "concept": "The Collection Snowboard: Hydrogen (x1)", "created_at": "2026-03-12T23:37:36.708786", "customer_id": 8, "merchant_id": "c4625125-3722-490c-94e0-008f00dc6e9a", "total_amount": 600.0, "installments_count": 0}
21	Credit	97	CREATE	2026-03-12 23:48:41.990118	{"id": 97, "status": "EMITIDO", "balance": 600.0, "concept": "The Collection Snowboard: Hydrogen (x1)", "created_at": "2026-03-12T23:48:41.988125", "customer_id": 8, "merchant_id": "c4625125-3722-490c-94e0-008f00dc6e9a", "total_amount": 600.0, "installments_count": 0}
22	Credit	97	DELETE	2026-03-12 23:53:01.029672	{"id": 97, "status": "EMITIDO", "balance": 600.0, "concept": "The Collection Snowboard: Hydrogen (x1)", "created_at": "2026-03-12T23:48:41.988125", "customer_id": 8, "merchant_id": "c4625125-3722-490c-94e0-008f00dc6e9a", "total_amount": 600.0, "installments_count": 0}
23	Credit	98	CREATE	2026-03-12 23:53:12.937377	{"id": 98, "status": "EMITIDO", "balance": 600.0, "concept": "The Collection Snowboard: Hydrogen (x1)", "created_at": "2026-03-12T23:53:12.935151", "customer_id": 8, "merchant_id": "c4625125-3722-490c-94e0-008f00dc6e9a", "total_amount": 600.0, "installments_count": 0}
24	Credit	99	CREATE	2026-03-12 23:54:07.544864	{"id": 99, "status": "EMITIDO", "balance": 629.95, "concept": "The Archived Snowboard (x1)", "created_at": "2026-03-12T23:54:07.542869", "customer_id": 8, "merchant_id": "c4625125-3722-490c-94e0-008f00dc6e9a", "total_amount": 629.95, "installments_count": 3}
25	Credit	100	CREATE	2026-03-12 23:58:24.689084	{"id": 100, "status": "EMITIDO", "balance": 885.95, "concept": "The Minimal Snowboard (x1)", "created_at": "2026-03-12T23:58:24.686092", "customer_id": 8, "merchant_id": "c4625125-3722-490c-94e0-008f00dc6e9a", "total_amount": 885.95, "installments_count": 3}
26	Payment	58	CREATE	2026-03-13 00:01:41.445076	{"id": 58, "notes": "Intención de pago generada vía link de cobro", "amount": 209.98, "status": "REGISTRADO", "credit_id": 99, "created_at": "2026-03-13T00:01:41.443081", "updated_at": "2026-03-13T00:01:41.443081", "merchant_id": "c4625125-3722-490c-94e0-008f00dc6e9a", "reviewed_at": null, "reviewed_by": null, "payment_date": "2026-03-13T00:01:41.441086", "installment_id": 115, "payment_method": "Link de Pago", "reference_number": "INTENT-9CF4AD1D", "punctuality_value": null, "installments_covered": null}
27	Payment	59	CREATE	2026-03-13 00:02:07.781107	{"id": 59, "notes": "Intención de pago generada vía link de cobro", "amount": 209.98, "status": "REGISTRADO", "credit_id": 99, "created_at": "2026-03-13T00:02:07.780083", "updated_at": "2026-03-13T00:02:07.780083", "merchant_id": "c4625125-3722-490c-94e0-008f00dc6e9a", "reviewed_at": null, "reviewed_by": null, "payment_date": "2026-03-13T00:02:07.779085", "installment_id": 116, "payment_method": "Link de Pago", "reference_number": "INTENT-4D078AF6", "punctuality_value": null, "installments_covered": null}
28	Payment	60	CREATE	2026-03-13 00:09:02.045594	{"id": 60, "notes": "Intención de pago generada vía link de cobro", "amount": 600.0, "status": "REGISTRADO", "credit_id": 98, "created_at": "2026-03-13T00:09:02.043600", "updated_at": "2026-03-13T00:09:02.043600", "merchant_id": "c4625125-3722-490c-94e0-008f00dc6e9a", "reviewed_at": null, "reviewed_by": null, "payment_date": "2026-03-13T00:09:02.042597", "installment_id": null, "payment_method": "Link de Pago", "reference_number": "INTENT-8AF6B9EC", "punctuality_value": null, "installments_covered": null}
29	Payment	60	DELETE	2026-03-13 00:15:26.135309	{"id": 60, "notes": "Doc: V-94666317 | Teléf: 04124557541 | Extra: pago", "amount": 600.0, "status": "APROBADO", "credit_id": 98, "created_at": "2026-03-13T00:09:02.043600", "updated_at": "2026-03-13T00:10:27.850081", "merchant_id": "c4625125-3722-490c-94e0-008f00dc6e9a", "reviewed_at": "2026-03-13T00:11:26.641841", "reviewed_by": "c4625125-3722-490c-94e0-008f00dc6e9a", "payment_date": "2026-03-13T00:09:02.042597", "installment_id": null, "payment_method": "(0115) BANCO EXTERIOR C.A., BANCO UNIVERSAL", "reference_number": "1231313253123", "punctuality_value": null, "installments_covered": null}
30	Credit	98	DELETE	2026-03-13 00:15:26.15366	{"id": 98, "status": "EN_PROGRESO", "balance": 600.0, "concept": "The Collection Snowboard: Hydrogen (x1)", "created_at": "2026-03-12T23:53:12.935151", "customer_id": 8, "merchant_id": "c4625125-3722-490c-94e0-008f00dc6e9a", "total_amount": 600.0, "installments_count": 0}
31	Payment	58	DELETE	2026-03-13 00:15:28.486334	{"id": 58, "notes": "Intención de pago generada vía link de cobro", "amount": 209.98, "status": "REGISTRADO", "credit_id": 99, "created_at": "2026-03-13T00:01:41.443081", "updated_at": "2026-03-13T00:01:41.443081", "merchant_id": "c4625125-3722-490c-94e0-008f00dc6e9a", "reviewed_at": null, "reviewed_by": null, "payment_date": "2026-03-13T00:01:41.441086", "installment_id": 115, "payment_method": "Link de Pago", "reference_number": "INTENT-9CF4AD1D", "punctuality_value": null, "installments_covered": null}
32	Payment	59	DELETE	2026-03-13 00:15:28.487368	{"id": 59, "notes": "Doc: J-30212172 | Teléf: 04124557541 | Extra: pago", "amount": 209.98, "status": "APROBADO", "credit_id": 99, "created_at": "2026-03-13T00:02:07.780083", "updated_at": "2026-03-13T00:03:00.977109", "merchant_id": "c4625125-3722-490c-94e0-008f00dc6e9a", "reviewed_at": "2026-03-13T00:03:15.133068", "reviewed_by": "c4625125-3722-490c-94e0-008f00dc6e9a", "payment_date": "2026-03-13T00:02:07.779085", "installment_id": 116, "payment_method": "(0128) BANCO CARONÍ C.A., BANCO UNIVERSAL", "reference_number": "1231313253125", "punctuality_value": null, "installments_covered": null}
33	Credit	99	DELETE	2026-03-13 00:15:28.572778	{"id": 99, "status": "EN_PROGRESO", "balance": 629.95, "concept": "The Archived Snowboard (x1)", "created_at": "2026-03-12T23:54:07.542869", "customer_id": 8, "merchant_id": "c4625125-3722-490c-94e0-008f00dc6e9a", "total_amount": 629.95, "installments_count": 3}
34	Credit	100	DELETE	2026-03-13 00:15:30.534925	{"id": 100, "status": "EMITIDO", "balance": 885.95, "concept": "The Minimal Snowboard (x1)", "created_at": "2026-03-12T23:58:24.686092", "customer_id": 8, "merchant_id": "c4625125-3722-490c-94e0-008f00dc6e9a", "total_amount": 885.95, "installments_count": 3}
35	Credit	101	CREATE	2026-03-13 00:15:48.31626	{"id": 101, "status": "EMITIDO", "balance": 600.0, "concept": "The Collection Snowboard: Hydrogen (x1)", "created_at": "2026-03-13T00:15:48.185530", "customer_id": 8, "merchant_id": "c4625125-3722-490c-94e0-008f00dc6e9a", "total_amount": 600.0, "installments_count": 0}
36	Payment	61	CREATE	2026-03-13 00:16:00.295701	{"id": 61, "notes": "Intención de pago generada vía link de cobro", "amount": 600.0, "status": "REGISTRADO", "credit_id": 101, "created_at": "2026-03-13T00:16:00.294737", "updated_at": "2026-03-13T00:16:00.294737", "merchant_id": "c4625125-3722-490c-94e0-008f00dc6e9a", "reviewed_at": null, "reviewed_by": null, "payment_date": "2026-03-13T00:16:00.292795", "installment_id": null, "payment_method": "Link de Pago", "reference_number": "INTENT-2F7CE94B", "punctuality_value": null, "installments_covered": null}
37	Credit	102	CREATE	2026-03-13 00:17:49.933831	{"id": 102, "status": "EMITIDO", "balance": 600.0, "concept": "The Collection Snowboard: Hydrogen (x1)", "created_at": "2026-03-13T00:17:49.931900", "customer_id": 8, "merchant_id": "c4625125-3722-490c-94e0-008f00dc6e9a", "total_amount": 600.0, "installments_count": 0}
38	Payment	62	CREATE	2026-03-13 00:18:02.825077	{"id": 62, "notes": "Intención de pago generada vía link de cobro", "amount": 600.0, "status": "REGISTRADO", "credit_id": 102, "created_at": "2026-03-13T00:18:02.683899", "updated_at": "2026-03-13T00:18:02.683899", "merchant_id": "c4625125-3722-490c-94e0-008f00dc6e9a", "reviewed_at": null, "reviewed_by": null, "payment_date": "2026-03-13T00:18:02.682987", "installment_id": null, "payment_method": "Link de Pago", "reference_number": "INTENT-BEFB65DA", "punctuality_value": null, "installments_covered": null}
39	Payment	63	CREATE	2026-03-13 00:21:06.279285	{"id": 63, "notes": "[DISTRIBUTE_EXCESS]", "amount": 700.0, "status": "EN_REVISION", "credit_id": 102, "created_at": "2026-03-13T00:21:06.277552", "updated_at": "2026-03-13T00:21:06.277552", "merchant_id": "c4625125-3722-490c-94e0-008f00dc6e9a", "reviewed_at": null, "reviewed_by": null, "payment_date": "2026-03-13T00:21:06.276555", "installment_id": null, "payment_method": "BANK", "reference_number": "EFECTIVO-1773361266196", "punctuality_value": null, "installments_covered": null}
40	Credit	103	CREATE	2026-03-14 15:47:11.900462	{"id": 103, "status": "EMITIDO", "balance": 49.9, "concept": "Selling Plans Ski Wax (x2)", "created_at": "2026-03-14T15:47:11.485215", "customer_id": 8, "merchant_id": "c4625125-3722-490c-94e0-008f00dc6e9a", "total_amount": 49.9, "installments_count": 0}
41	Credit	104	CREATE	2026-03-14 15:47:58.912537	{"id": 104, "status": "EMITIDO", "balance": 24.95, "concept": "Selling Plans Ski Wax (x1)", "created_at": "2026-03-14T15:47:58.912537", "customer_id": 8, "merchant_id": "c4625125-3722-490c-94e0-008f00dc6e9a", "total_amount": 24.95, "installments_count": 0}
42	Credit	105	CREATE	2026-03-14 15:51:51.165375	{"id": 105, "status": "EMITIDO", "balance": 24.95, "concept": "Selling Plans Ski Wax (x1)", "created_at": "2026-03-14T15:51:51.165375", "customer_id": 8, "merchant_id": "c4625125-3722-490c-94e0-008f00dc6e9a", "total_amount": 24.95, "installments_count": 0}
43	Payment	64	CREATE	2026-03-14 16:05:33.025555	{"id": 64, "notes": "Intención de pago generada vía link de cobro", "amount": 24.95, "status": "REGISTRADO", "credit_id": 105, "created_at": "2026-03-14T16:05:32.891875", "updated_at": "2026-03-14T16:05:32.891875", "merchant_id": "c4625125-3722-490c-94e0-008f00dc6e9a", "reviewed_at": null, "reviewed_by": null, "payment_date": "2026-03-14T16:05:32.891875", "installment_id": null, "payment_method": "Link de Pago", "reference_number": "INTENT-DC6B744E", "punctuality_value": null, "installments_covered": null}
44	Payment	65	CREATE	2026-03-14 16:17:08.039534	{"id": 65, "notes": "Intención de pago generada vía link de cobro", "amount": 24.95, "status": "REGISTRADO", "credit_id": 105, "created_at": "2026-03-14T16:17:07.966734", "updated_at": "2026-03-14T16:17:07.966734", "merchant_id": "c4625125-3722-490c-94e0-008f00dc6e9a", "reviewed_at": null, "reviewed_by": null, "payment_date": "2026-03-14T16:17:07.958715", "installment_id": null, "payment_method": "Link de Pago", "reference_number": "INTENT-791E2008", "punctuality_value": null, "installments_covered": null}
45	Credit	106	CREATE	2026-03-14 19:28:18.042056	{"id": 106, "status": "EMITIDO", "balance": 2629.95, "concept": "The Draft Snowboard (x1)", "created_at": "2026-03-14T19:28:17.841940", "customer_id": 8, "merchant_id": "c4625125-3722-490c-94e0-008f00dc6e9a", "total_amount": 2629.95, "installments_count": 0}
46	Credit	104	DELETE	2026-03-14 19:28:36.630461	{"id": 104, "status": "EMITIDO", "balance": 24.95, "concept": "Selling Plans Ski Wax (x1)", "created_at": "2026-03-14T15:47:58.912537", "customer_id": 8, "merchant_id": "c4625125-3722-490c-94e0-008f00dc6e9a", "total_amount": 24.95, "installments_count": 0}
47	Credit	103	DELETE	2026-03-14 19:28:38.58404	{"id": 103, "status": "EMITIDO", "balance": 49.9, "concept": "Selling Plans Ski Wax (x2)", "created_at": "2026-03-14T15:47:11.485215", "customer_id": 8, "merchant_id": "c4625125-3722-490c-94e0-008f00dc6e9a", "total_amount": 49.9, "installments_count": 0}
48	Payment	66	CREATE	2026-03-22 17:43:40.271318	{"id": 66, "notes": "Intención de pago generada vía link de cobro", "amount": 2629.95, "status": "REGISTRADO", "credit_id": 106, "created_at": "2026-03-22T17:43:39.931940", "updated_at": "2026-03-22T17:43:39.931940", "merchant_id": "c4625125-3722-490c-94e0-008f00dc6e9a", "reviewed_at": null, "reviewed_by": null, "payment_date": "2026-03-22T17:43:39.931940", "installment_id": null, "payment_method": "Link de Pago", "reference_number": "INTENT-C5003263", "punctuality_value": null, "installments_covered": null}
49	Payment	66	DELETE	2026-03-24 03:08:38.51189	{"id": 66, "notes": "Doc: V-9778549 | Teléf: 04124557547 | Extra: pago", "amount": 2629.95, "status": "CANCELADO", "credit_id": 106, "created_at": "2026-03-22T17:43:39.931940", "updated_at": "2026-03-22T17:47:07.707696", "merchant_id": "c4625125-3722-490c-94e0-008f00dc6e9a", "reviewed_at": "2026-03-23T01:18:20.972840", "reviewed_by": "c4625125-3722-490c-94e0-008f00dc6e9a", "payment_date": "2026-03-22T17:43:39.931940", "installment_id": null, "payment_method": "(0172) BANCAMIGA BANCO UNIVERSAL, C.A.", "reference_number": "1231313253126", "punctuality_value": null, "installments_covered": null}
50	Credit	106	DELETE	2026-03-24 03:08:39.109298	{"id": 106, "status": "CANCELADO", "balance": 2629.95, "concept": "The Draft Snowboard (x1)", "created_at": "2026-03-14T19:28:17.841940", "customer_id": 8, "merchant_id": "c4625125-3722-490c-94e0-008f00dc6e9a", "total_amount": 2629.95, "installments_count": 0}
51	Payment	64	DELETE	2026-03-24 03:08:40.55715	{"id": 64, "notes": "Intención de pago generada vía link de cobro", "amount": 24.95, "status": "APROBADO", "credit_id": 105, "created_at": "2026-03-14T16:05:32.891875", "updated_at": "2026-03-14T16:05:32.891875", "merchant_id": "c4625125-3722-490c-94e0-008f00dc6e9a", "reviewed_at": "2026-03-14T19:27:56.129156", "reviewed_by": "c4625125-3722-490c-94e0-008f00dc6e9a", "payment_date": "2026-03-14T16:05:32.891875", "installment_id": null, "payment_method": "Link de Pago", "reference_number": "INTENT-DC6B744E", "punctuality_value": null, "installments_covered": null}
52	Payment	65	DELETE	2026-03-24 03:08:40.559138	{"id": 65, "notes": "Doc: V-30212172 | Teléf: 04124557541 | Extra: pago", "amount": 24.95, "status": "APROBADO", "credit_id": 105, "created_at": "2026-03-14T16:17:07.966734", "updated_at": "2026-03-14T16:19:09.049372", "merchant_id": "c4625125-3722-490c-94e0-008f00dc6e9a", "reviewed_at": "2026-03-14T16:19:26.169883", "reviewed_by": "c4625125-3722-490c-94e0-008f00dc6e9a", "payment_date": "2026-03-14T16:17:07.958715", "installment_id": null, "payment_method": "(0128) BANCO CARONÍ C.A., BANCO UNIVERSAL", "reference_number": "1231313253122", "punctuality_value": null, "installments_covered": null}
53	Credit	105	DELETE	2026-03-24 03:08:40.562133	{"id": 105, "status": "PAGADO", "balance": 0.0, "concept": "Selling Plans Ski Wax (x1)", "created_at": "2026-03-14T15:51:51.165375", "customer_id": 8, "merchant_id": "c4625125-3722-490c-94e0-008f00dc6e9a", "total_amount": 24.95, "installments_count": 0}
54	Payment	61	DELETE	2026-03-24 03:08:47.669761	{"id": 61, "notes": "Doc: V-94666317 | Teléf: 04124557541 | Extra: pago", "amount": 600.0, "status": "APROBADO", "credit_id": 101, "created_at": "2026-03-13T00:16:00.294737", "updated_at": "2026-03-13T00:16:27.081633", "merchant_id": "c4625125-3722-490c-94e0-008f00dc6e9a", "reviewed_at": "2026-03-13T00:16:40.735847", "reviewed_by": "c4625125-3722-490c-94e0-008f00dc6e9a", "payment_date": "2026-03-13T00:16:00.292795", "installment_id": null, "payment_method": "(0137) BANCO SOFITASA BANCO UNIVERSAL, C.A.", "reference_number": "1231313253120", "punctuality_value": null, "installments_covered": null}
55	Credit	101	DELETE	2026-03-24 03:08:47.67263	{"id": 101, "status": "PAGADO", "balance": 0.0, "concept": "The Collection Snowboard: Hydrogen (x1)", "created_at": "2026-03-13T00:15:48.185530", "customer_id": 8, "merchant_id": "c4625125-3722-490c-94e0-008f00dc6e9a", "total_amount": 600.0, "installments_count": 0}
56	Credit	107	CREATE	2026-03-24 03:34:17.469522	{"id": 107, "status": "EMITIDO", "balance": 124.75, "concept": "Selling Plans Ski Wax (x5)", "created_at": "2026-03-24T03:34:17.037398", "customer_id": 8, "merchant_id": "c4625125-3722-490c-94e0-008f00dc6e9a", "total_amount": 124.75, "installments_count": 0}
57	Payment	67	CREATE	2026-03-24 03:37:10.036765	{"id": 67, "notes": "Intención de pago generada vía link de cobro", "amount": 124.75, "status": "REGISTRADO", "credit_id": 107, "created_at": "2026-03-24T03:37:09.923230", "updated_at": "2026-03-24T03:37:09.923230", "merchant_id": "c4625125-3722-490c-94e0-008f00dc6e9a", "reviewed_at": null, "reviewed_by": null, "payment_date": "2026-03-24T03:37:09.921238", "installment_id": null, "payment_method": "Link de Pago", "reference_number": "INTENT-78BC75D0", "punctuality_value": null, "installments_covered": null}
58	Payment	68	CREATE	2026-03-24 03:52:58.710076	{"id": 68, "notes": "[DISTRIBUTE_EXCESS]", "amount": 124.75, "status": "EN_REVISION", "credit_id": 107, "created_at": "2026-03-24T03:52:58.659928", "updated_at": "2026-03-24T03:52:58.659928", "merchant_id": "c4625125-3722-490c-94e0-008f00dc6e9a", "reviewed_at": null, "reviewed_by": null, "payment_date": "2026-03-24T03:52:58.658930", "installment_id": null, "payment_method": "BANK", "reference_number": "EFECTIVO-1774324378596", "punctuality_value": 100.0, "installments_covered": null}
59	Credit	108	CREATE	2026-03-24 03:55:36.990257	{"id": 108, "status": "EMITIDO", "balance": 699.95, "concept": "The Complete Snowboard (x1)", "created_at": "2026-03-24T03:55:36.988262", "customer_id": 8, "merchant_id": "c4625125-3722-490c-94e0-008f00dc6e9a", "total_amount": 699.95, "installments_count": 0}
60	Payment	69	CREATE	2026-03-24 03:58:38.801658	{"id": 69, "notes": "[DISTRIBUTE_EXCESS]", "amount": 699.95, "status": "EN_REVISION", "credit_id": 108, "created_at": "2026-03-24T03:58:38.798674", "updated_at": "2026-03-24T03:58:38.798674", "merchant_id": "c4625125-3722-490c-94e0-008f00dc6e9a", "reviewed_at": null, "reviewed_by": null, "payment_date": "2026-03-24T03:58:38.797668", "installment_id": null, "payment_method": "PAGO_MOVIL", "reference_number": "4444444444442", "punctuality_value": 100.0, "installments_covered": null}
61	Credit	109	CREATE	2026-03-24 04:05:36.348114	{"id": 109, "status": "EMITIDO", "balance": 885.95, "concept": "The Minimal Snowboard (x1)", "created_at": "2026-03-24T04:05:36.347120", "customer_id": 8, "merchant_id": "c4625125-3722-490c-94e0-008f00dc6e9a", "total_amount": 885.95, "installments_count": 0}
62	Payment	70	CREATE	2026-03-24 04:09:17.719903	{"id": 70, "notes": "[DISTRIBUTE_EXCESS]", "amount": 889.95, "status": "EN_REVISION", "credit_id": 109, "created_at": "2026-03-24T04:09:17.716912", "updated_at": "2026-03-24T04:09:17.716912", "merchant_id": "c4625125-3722-490c-94e0-008f00dc6e9a", "reviewed_at": null, "reviewed_by": null, "payment_date": "2026-03-24T04:09:17.715913", "installment_id": null, "payment_method": "BANK", "reference_number": "EFECTIVO-1774325357705", "punctuality_value": 100.0, "installments_covered": null}
\.


--
-- Data for Name: credit_history; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.credit_history (id, credit_id, event, description, created_at) FROM stdin;
1	1	CREDITO_CREADO	Total 1000.00	2025-12-22 22:43:49.599203-04
2	2	CREDITO_CREADO	Total 1000.00	2025-12-22 22:47:05.102758-04
3	3	CREDITO_CREADO	Total 1000.00	2025-12-22 22:47:17.765897-04
4	4	CREDITO_CREADO	Total 1000.00	2025-12-22 22:48:28.121426-04
5	5	CREDITO_CREADO	Total 1000.00	2025-12-22 22:50:13.358379-04
6	6	CREDITO_CREADO	Total 1000.00	2025-12-22 22:50:39.997794-04
7	7	CREDITO_CREADO	Total 1000.00	2025-12-22 22:50:47.294576-04
8	8	CREDITO_CREADO	Total 1000.00	2025-12-22 22:51:05.296272-04
9	9	CREDITO_CREADO	Total 1000.00	2025-12-22 22:51:13.447922-04
10	10	CREDITO_CREADO	Total 1000.00	2025-12-22 22:51:32.165182-04
11	11	CREDITO_CREADO	Total 1000.00	2025-12-22 22:53:14.099389-04
12	12	CREDITO_CREADO	Total 1000.00	2025-12-22 22:54:38.985551-04
13	13	CREDITO_CREADO	Total 1000.00	2025-12-22 22:55:57.912935-04
14	14	CREDITO_CREADO	Total 1000.00	2025-12-22 22:56:24.929253-04
15	15	CREDITO_CREADO	Total 1000.00	2025-12-22 23:00:28.841603-04
16	16	CREDITO_CREADO	Total 1000.00	2025-12-22 23:24:05.966596-04
17	17	CREDITO_CREADO	Total 1000.00	2025-12-22 23:25:35.036369-04
18	18	CREDITO_CREADO	Total 1000.00	2025-12-22 23:25:54.813732-04
19	19	CREDITO_CREADO	Total 1000.00	2025-12-22 23:35:54.739447-04
20	20	CREDITO_CREADO	Total 1000.00	2025-12-22 23:42:59.574579-04
21	21	CREDITO_CREADO	Total 1000.00	2025-12-22 23:54:16.736286-04
22	22	CREDITO_CREADO	Total 1000.00	2025-12-22 23:58:30.952078-04
23	22	CUOTAS_GENERADAS	3 cuotas	2025-12-22 23:58:31.054694-04
24	23	CREDITO_CREADO	Total 1000.00	2025-12-23 00:01:56.379699-04
25	23	CUOTAS_GENERADAS	3 cuotas	2025-12-23 00:01:56.39769-04
26	24	CREDITO_CREADO	Total 1000.00	2025-12-23 20:52:16.486354-04
27	25	CREDITO_CREADO	Total 1200.00	2025-12-23 21:19:26.712467-04
28	26	CREDITO_CREADO	Total 1200.00	2025-12-23 21:20:59.832728-04
29	27	CREDITO_CREADO	Total 1200.00	2025-12-23 21:21:23.537513-04
30	28	CREDITO_CREADO	Total 1200.00	2025-12-23 21:21:43.560078-04
31	29	CREDITO_CREADO	Total 1200.00	2025-12-23 21:21:54.409953-04
32	30	CREDITO_CREADO	Total 1200.00	2025-12-23 21:22:16.173212-04
33	31	CREDITO_CREADO	Total 1200.00	2025-12-23 21:25:01.164913-04
34	32	CREDITO_CREADO	Total 1200.00	2025-12-23 21:33:42.789812-04
35	33	CREDITO_CREADO	Total 1200.00	2025-12-23 21:34:47.124637-04
36	34	CREDITO_CREADO	Total 1200.00	2025-12-23 21:42:58.492051-04
37	34	CUOTAS_GENERADAS	3 cuotas generadas automáticamente	2025-12-23 21:42:58.610293-04
38	35	CREDITO_CREADO	Total 1200.00	2025-12-23 22:42:36.196181-04
39	35	CUOTAS_GENERADAS	3 cuotas generadas automáticamente	2025-12-23 22:42:36.289024-04
40	36	CREDITO_CREADO	Total 1200.00	2025-12-23 23:48:08.547822-04
41	36	CUOTAS_GENERADAS	3 cuotas generadas automáticamente	2025-12-23 23:48:08.696332-04
42	37	CREDITO_CREADO	Total 1200.00	2025-12-23 23:48:48.542324-04
43	37	CUOTAS_GENERADAS	3 cuotas generadas automáticamente	2025-12-23 23:48:48.557839-04
44	38	CREDITO_CREADO	Total 1200.00	2025-12-23 23:54:12.991944-04
45	38	CUOTAS_GENERADAS	3 cuotas generadas automáticamente	2025-12-23 23:54:13.011094-04
46	39	CREDITO_CREADO	Total 1200.00	2025-12-24 00:29:42.896307-04
47	39	CUOTAS_GENERADAS	3 cuotas generadas automáticamente	2025-12-24 00:29:42.914809-04
48	40	CREDITO_CREADO	Total 1200.00	2025-12-24 00:30:26.145492-04
49	40	CUOTAS_GENERADAS	3 cuotas generadas automáticamente	2025-12-24 00:30:26.159853-04
50	41	CREDITO_CREADO	Total 1200.00	2025-12-24 00:31:08.919178-04
51	41	CUOTAS_GENERADAS	3 cuotas generadas automáticamente	2025-12-24 00:31:08.934345-04
52	42	CREDITO_CREADO	Total 1200.00	2025-12-24 11:10:19.013119-04
53	42	CUOTAS_GENERADAS	3 cuotas generadas automáticamente	2025-12-24 11:10:19.289829-04
54	43	CREDITO_CREADO	Total 1200.00	2025-12-24 11:10:37.855844-04
55	43	CUOTAS_GENERADAS	3 cuotas generadas automáticamente	2025-12-24 11:10:37.870568-04
56	44	CREDITO_CREADO	Total 1200.00	2025-12-24 11:11:00.96812-04
57	44	CUOTAS_GENERADAS	3 cuotas generadas automáticamente	2025-12-24 11:11:00.981333-04
58	45	CREDITO_CREADO	Total 1200.00	2025-12-24 11:11:33.577029-04
59	45	CUOTAS_GENERADAS	3 cuotas generadas automáticamente	2025-12-24 11:11:33.593471-04
60	46	CREDITO_CREADO	Total 1200.00	2025-12-24 11:12:09.031575-04
61	46	CUOTAS_GENERADAS	3 cuotas generadas automáticamente	2025-12-24 11:12:09.046681-04
62	47	CREDITO_CREADO	Total 1200.00	2025-12-24 11:12:27.411279-04
63	47	CUOTAS_GENERADAS	3 cuotas generadas automáticamente	2025-12-24 11:12:27.421997-04
64	48	CREDITO_CREADO	Total 1200.00	2025-12-24 11:13:27.758015-04
65	48	CUOTAS_GENERADAS	3 cuotas generadas automáticamente	2025-12-24 11:13:27.776002-04
66	49	CREDITO_CREADO	Total 1200.00	2025-12-24 11:13:42.544448-04
67	49	CUOTAS_GENERADAS	3 cuotas generadas automáticamente	2025-12-24 11:13:42.55856-04
68	50	CREDITO_CREADO	Total 1200.00	2025-12-24 11:14:13.967121-04
69	50	CUOTAS_GENERADAS	3 cuotas generadas automáticamente	2025-12-24 11:14:13.983571-04
70	51	CREDITO_CREADO	Total 1200.00	2025-12-24 11:14:21.190595-04
71	51	CUOTAS_GENERADAS	3 cuotas generadas automáticamente	2025-12-24 11:14:21.209421-04
72	52	CREDITO_CREADO	Total 1200.00	2025-12-24 11:18:26.485993-04
73	52	CUOTAS_GENERADAS	3 cuotas generadas automáticamente	2025-12-24 11:18:26.503622-04
74	53	CREDITO_CREADO	Total 1200.00	2025-12-24 11:21:24.672864-04
75	53	CUOTAS_GENERADAS	3 cuotas generadas automáticamente	2025-12-24 11:21:24.690598-04
76	54	CREDITO_CREADO	Total 1000.00	2025-12-24 19:30:31.50656-04
77	54	CUOTAS_GENERADAS	3 cuotas generadas automáticamente	2025-12-24 19:30:31.606742-04
78	55	CREDITO_CREADO	Total 400.00	2025-12-28 18:52:57.24005-04
79	55	CUOTAS_GENERADAS	1 cuotas generadas automáticamente	2025-12-28 18:52:57.415337-04
80	56	CREDITO_CREADO	Total 400.00	2025-12-28 18:53:11.409902-04
81	56	CUOTAS_GENERADAS	4 cuotas generadas automáticamente	2025-12-28 18:53:11.535503-04
86	60	CREDITO_CREADO	Total 0.00	2026-02-25 12:02:53.406534-04
87	61	CREDITO_CREADO	Total 0.00	2026-02-25 12:03:22.585944-04
88	62	CREDITO_CREADO	Total 0.00	2026-02-25 12:08:36.186595-04
89	63	CREDITO_CREADO	Total 0.00	2026-02-25 12:08:49.392061-04
90	64	CREDITO_CREADO	Total 0.00	2026-02-25 12:09:12.934313-04
91	65	CREDITO_CREADO	Total 0.00	2026-02-25 12:09:28.614295-04
92	66	CREDITO_CREADO	Total 0.00	2026-02-25 13:18:52.09142-04
143	102	CREDITO_CREADO	Total 600.00 con 1 productos	2026-03-12 20:17:49.952453-04
147	107	CREDITO_CREADO	Total 124.75 con 1 productos	2026-03-23 23:34:17.664745-04
148	108	CREDITO_CREADO	Total 699.95 con 1 productos	2026-03-23 23:55:37.098237-04
149	109	CREDITO_CREADO	Total 885.95 con 1 productos	2026-03-24 00:05:36.462243-04
\.


--
-- Data for Name: credit_installments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.credit_installments (id, credit_id, amount, due_date, number, status, paid_amount, paid_at) FROM stdin;
2	22	333.33	2025-12-25	1	PENDIENTE	0.00	\N
3	22	333.33	2026-01-24	2	PENDIENTE	0.00	\N
4	22	333.34	2026-02-23	3	PENDIENTE	0.00	\N
5	23	333.33	2025-12-25	1	PENDIENTE	0.00	\N
6	23	333.33	2026-01-24	2	PENDIENTE	0.00	\N
7	23	333.34	2026-02-23	3	PENDIENTE	0.00	\N
8	34	400.00	2026-01-15	1	PENDIENTE	0.00	\N
9	34	400.00	2026-01-15	2	PENDIENTE	0.00	\N
10	34	400.00	2026-01-15	3	PENDIENTE	0.00	\N
11	35	400.00	2026-01-15	1	PENDIENTE	0.00	\N
12	35	400.00	2026-01-15	2	PENDIENTE	0.00	\N
13	35	400.00	2026-01-15	3	PENDIENTE	0.00	\N
14	36	400.00	2026-01-15	1	PENDIENTE	0.00	\N
15	36	400.00	2026-01-15	2	PENDIENTE	0.00	\N
16	36	400.00	2026-01-15	3	PENDIENTE	0.00	\N
17	37	400.00	2026-01-15	1	PENDIENTE	0.00	\N
18	37	400.00	2026-01-15	2	PENDIENTE	0.00	\N
19	37	400.00	2026-01-15	3	PENDIENTE	0.00	\N
20	38	400.00	2026-01-15	1	PENDIENTE	0.00	\N
21	38	400.00	2026-01-15	2	PENDIENTE	0.00	\N
22	38	400.00	2026-01-15	3	PENDIENTE	0.00	\N
23	39	400.00	2026-01-15	1	PENDIENTE	0.00	\N
24	39	400.00	2026-01-15	2	PENDIENTE	0.00	\N
25	39	400.00	2026-01-15	3	PENDIENTE	0.00	\N
26	40	400.00	2026-01-15	1	PENDIENTE	0.00	\N
27	40	400.00	2026-01-15	2	PENDIENTE	0.00	\N
28	40	400.00	2026-01-15	3	PENDIENTE	0.00	\N
29	41	400.00	2026-01-15	1	PENDIENTE	0.00	\N
30	41	400.00	2026-01-15	2	PENDIENTE	0.00	\N
31	41	400.00	2026-01-15	3	PENDIENTE	0.00	\N
32	42	400.00	2026-01-15	1	PENDIENTE	0.00	\N
33	42	400.00	2026-01-15	2	PENDIENTE	0.00	\N
34	42	400.00	2026-01-15	3	PENDIENTE	0.00	\N
35	43	400.00	2026-01-15	1	PENDIENTE	0.00	\N
36	43	400.00	2026-01-15	2	PENDIENTE	0.00	\N
37	43	400.00	2026-01-15	3	PENDIENTE	0.00	\N
38	44	400.00	2026-01-15	1	PENDIENTE	0.00	\N
39	44	400.00	2026-01-15	2	PENDIENTE	0.00	\N
40	44	400.00	2026-01-15	3	PENDIENTE	0.00	\N
41	45	400.00	2026-01-15	1	PENDIENTE	0.00	\N
42	45	400.00	2026-01-15	2	PENDIENTE	0.00	\N
43	45	400.00	2026-01-15	3	PENDIENTE	0.00	\N
44	46	400.00	2026-01-15	1	PENDIENTE	0.00	\N
45	46	400.00	2026-01-15	2	PENDIENTE	0.00	\N
46	46	400.00	2026-01-15	3	PENDIENTE	0.00	\N
47	47	400.00	2026-01-15	1	PENDIENTE	0.00	\N
48	47	400.00	2026-01-15	2	PENDIENTE	0.00	\N
49	47	400.00	2026-01-15	3	PENDIENTE	0.00	\N
50	48	400.00	2026-01-15	1	PENDIENTE	0.00	\N
51	48	400.00	2026-01-15	2	PENDIENTE	0.00	\N
52	48	400.00	2026-01-15	3	PENDIENTE	0.00	\N
53	49	400.00	2026-01-15	1	PENDIENTE	0.00	\N
54	49	400.00	2026-01-15	2	PENDIENTE	0.00	\N
55	49	400.00	2026-01-15	3	PENDIENTE	0.00	\N
56	50	400.00	2026-01-15	1	PENDIENTE	0.00	\N
57	50	400.00	2026-01-15	2	PENDIENTE	0.00	\N
58	50	400.00	2026-01-15	3	PENDIENTE	0.00	\N
59	51	400.00	2026-01-15	1	PENDIENTE	0.00	\N
60	51	400.00	2026-01-15	2	PENDIENTE	0.00	\N
61	51	400.00	2026-01-15	3	PENDIENTE	0.00	\N
63	52	400.00	2026-01-15	2	PENDIENTE	0.00	\N
64	52	400.00	2026-01-15	3	PENDIENTE	0.00	\N
65	53	400.00	2026-01-15	1	PENDIENTE	0.00	\N
66	53	400.00	2026-01-15	2	PENDIENTE	0.00	\N
67	53	400.00	2026-01-15	3	PENDIENTE	0.00	\N
68	54	333.33	2025-12-25	1	PENDIENTE	0.00	\N
69	54	333.33	2025-12-25	2	PENDIENTE	0.00	\N
70	54	333.34	2025-12-25	3	PENDIENTE	0.00	\N
62	52	400.00	2026-01-15	1	PAGADA	0.00	\N
71	55	400.00	2025-12-28	1	PENDIENTE	0.00	\N
72	56	100.00	2025-12-28	1	PENDIENTE	0.00	\N
73	56	100.00	2025-12-28	2	PENDIENTE	0.00	\N
74	56	100.00	2025-12-28	3	PENDIENTE	0.00	\N
75	56	100.00	2025-12-28	4	PENDIENTE	0.00	\N
\.


--
-- Data for Name: credit_items; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.credit_items (id, credit_id, product_id, product_code, product_name, quantity, unit_price) FROM stdin;
25	102	gid://shopify/Product/10213522604348	\N	The Collection Snowboard: Hydrogen	1	600.00
30	107	gid://shopify/Product/10213522637116	\N	Selling Plans Ski Wax	5	24.95
31	108	gid://shopify/Product/10213522571580	\N	The Complete Snowboard	1	699.95
32	109	gid://shopify/Product/10213522374972	\N	The Minimal Snowboard	1	885.95
\.


--
-- Data for Name: credits; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.credits (id, customer_id, concept, total_amount, balance, status, merchant_id, installments_count, created_at) FROM stdin;
1	1	Venta de equipos	1000.00	1000.00	PENDIENTE_ACTIVACION	11111111-1111-1111-1111-111111111111	3	2025-12-23 02:43:48.947985
2	1	Venta de equipos	1000.00	1000.00	PENDIENTE_ACTIVACION	11111111-1111-1111-1111-111111111111	3	2025-12-23 02:47:05.072406
3	1	Venta de equipos	1000.00	1000.00	PENDIENTE_ACTIVACION	11111111-1111-1111-1111-111111111111	3	2025-12-23 02:47:17.667796
4	1	Venta de equipos	1000.00	1000.00	PENDIENTE_ACTIVACION	11111111-1111-1111-1111-111111111111	3	2025-12-23 02:48:28.112276
5	1	Venta contado	1000.00	1000.00	PENDIENTE_ACTIVACION	11111111-1111-1111-1111-111111111111	0	2025-12-23 02:50:13.350714
6	1	Venta de equipos	1000.00	1000.00	PENDIENTE_ACTIVACION	11111111-1111-1111-1111-111111111111	3	2025-12-23 02:50:39.989033
7	1	Venta de equipos	1000.00	1000.00	PENDIENTE_ACTIVACION	11111111-1111-1111-1111-111111111111	0	2025-12-23 02:50:47.214457
8	1	Venta de equipos	1000.00	1000.00	PENDIENTE_ACTIVACION	11111111-1111-1111-1111-111111111111	3	2025-12-23 02:51:05.285397
9	1	Venta de equipos	1000.00	1000.00	PENDIENTE_ACTIVACION	11111111-1111-1111-1111-111111111111	0	2025-12-23 02:51:13.359123
10	1	Venta de equipos	1000.00	1000.00	PENDIENTE_ACTIVACION	11111111-1111-1111-1111-111111111111	0	2025-12-23 02:51:32.156036
11	1	Venta de equipos	1000.00	1000.00	PENDIENTE_ACTIVACION	11111111-1111-1111-1111-111111111111	0	2025-12-23 02:53:14.089749
12	1	Venta de equipos	1000.00	1000.00	PENDIENTE_ACTIVACION	11111111-1111-1111-1111-111111111111	0	2025-12-23 02:54:38.937567
13	1	Venta de equipos	1000.00	1000.00	PENDIENTE_ACTIVACION	11111111-1111-1111-1111-111111111111	0	2025-12-23 02:55:57.902919
14	1	Venta contado	1000.00	1000.00	PENDIENTE_ACTIVACION	11111111-1111-1111-1111-111111111111	0	2025-12-23 02:56:24.916397
15	1	Venta contado	1000.00	1000.00	PENDIENTE_ACTIVACION	11111111-1111-1111-1111-111111111111	0	2025-12-23 03:00:28.746968
16	1	Venta contado	1000.00	1000.00	PENDIENTE_ACTIVACION	11111111-1111-1111-1111-111111111111	0	2025-12-23 03:24:05.94818
17	1	Venta contado	1000.00	1000.00	PENDIENTE_ACTIVACION	11111111-1111-1111-1111-111111111111	0	2025-12-23 03:25:35.01373
18	1	Venta contado	1000.00	1000.00	PENDIENTE_ACTIVACION	11111111-1111-1111-1111-111111111111	3	2025-12-23 03:25:53.933887
19	1	Venta contado	1000.00	1000.00	PENDIENTE_ACTIVACION	11111111-1111-1111-1111-111111111111	3	2025-12-23 03:35:54.730759
20	1	Venta contado	1000.00	1000.00	PENDIENTE_ACTIVACION	11111111-1111-1111-1111-111111111111	3	2025-12-23 03:42:59.491262
21	1	Venta contado	1000.00	1000.00	PENDIENTE_ACTIVACION	11111111-1111-1111-1111-111111111111	3	2025-12-23 03:54:16.602244
22	1	Venta contado	1000.00	1000.00	PENDIENTE_ACTIVACION	11111111-1111-1111-1111-111111111111	3	2025-12-23 03:58:30.925878
23	1	Venta contado	1000.00	1000.00	PENDIENTE_ACTIVACION	11111111-1111-1111-1111-111111111111	3	2025-12-23 04:01:56.328323
24	1	Venta contado	1000.00	1000.00	PENDIENTE_ACTIVACION	11111111-1111-1111-1111-111111111111	0	2025-12-24 00:52:15.955701
25	1	Venta a crédito	1200.00	1200.00	PENDIENTE_ACTIVACION	11111111-1111-1111-1111-111111111111	3	2025-12-24 01:19:26.652287
26	1	Venta a crédito	1200.00	1200.00	PENDIENTE_ACTIVACION	11111111-1111-1111-1111-111111111111	3	2025-12-24 01:20:59.759017
27	1	Venta a crédito	1200.00	1200.00	PENDIENTE_ACTIVACION	11111111-1111-1111-1111-111111111111	3	2025-12-24 01:21:23.515612
28	1	Venta a crédito	1200.00	1200.00	PENDIENTE_ACTIVACION	11111111-1111-1111-1111-111111111111	3	2025-12-24 01:21:43.541639
29	1	Venta a crédito	1200.00	1200.00	PENDIENTE_ACTIVACION	11111111-1111-1111-1111-111111111111	3	2025-12-24 01:21:54.390289
30	1	Venta a crédito	1200.00	1200.00	PENDIENTE_ACTIVACION	11111111-1111-1111-1111-111111111111	3	2025-12-24 01:22:16.155395
31	1	Venta a crédito	1200.00	1200.00	PENDIENTE_ACTIVACION	11111111-1111-1111-1111-111111111111	3	2025-12-24 01:25:01.128581
32	1	Venta a crédito	1200.00	1200.00	PENDIENTE_ACTIVACION	11111111-1111-1111-1111-111111111111	3	2025-12-24 01:33:42.740951
33	1	Venta a crédito	1200.00	1200.00	PENDIENTE_ACTIVACION	11111111-1111-1111-1111-111111111111	3	2025-12-24 01:34:47.076063
34	1	Venta a crédito	1200.00	1200.00	PENDIENTE_ACTIVACION	11111111-1111-1111-1111-111111111111	3	2025-12-24 01:42:58.452208
35	1	Venta a crédito	1200.00	1200.00	PENDIENTE_ACTIVACION	11111111-1111-1111-1111-111111111111	3	2025-12-24 02:42:36.122017
36	1	Venta a crédito	1200.00	1200.00	PENDIENTE_ACTIVACION	11111111-1111-1111-1111-111111111111	3	2025-12-24 03:48:08.285198
37	1	Venta a crédito	1200.00	1200.00	PENDIENTE_ACTIVACION	11111111-1111-1111-1111-111111111111	3	2025-12-24 03:48:48.429112
38	1	Venta a crédito	1200.00	1200.00	PENDIENTE_ACTIVACION	11111111-1111-1111-1111-111111111111	3	2025-12-24 03:54:12.656098
39	1	Venta a crédito	1200.00	1200.00	PENDIENTE_ACTIVACION	11111111-1111-1111-1111-111111111111	3	2025-12-24 04:29:42.755549
40	1	Venta a crédito	1200.00	1200.00	PENDIENTE_ACTIVACION	11111111-1111-1111-1111-111111111111	3	2025-12-24 04:30:26.100837
41	1	Venta a crédito	1200.00	1200.00	PENDIENTE_ACTIVACION	11111111-1111-1111-1111-111111111111	3	2025-12-24 04:31:08.750341
42	1	Venta a crédito	1200.00	1200.00	PENDIENTE_ACTIVACION	11111111-1111-1111-1111-111111111111	3	2025-12-24 15:10:18.443361
43	1	Venta a crédito	1200.00	1200.00	PENDIENTE_ACTIVACION	11111111-1111-1111-1111-111111111111	3	2025-12-24 15:10:37.835348
44	1	Venta a crédito	1200.00	1200.00	PENDIENTE_ACTIVACION	11111111-1111-1111-1111-111111111111	3	2025-12-24 15:11:00.939327
45	1	Venta a crédito	1200.00	1200.00	PENDIENTE_ACTIVACION	11111111-1111-1111-1111-111111111111	3	2025-12-24 15:11:33.558737
46	1	Venta a crédito	1200.00	1200.00	PENDIENTE_ACTIVACION	11111111-1111-1111-1111-111111111111	3	2025-12-24 15:12:08.965649
47	1	Venta a crédito	1200.00	1200.00	PENDIENTE_ACTIVACION	11111111-1111-1111-1111-111111111111	3	2025-12-24 15:12:27.400562
48	1	Venta a crédito	1200.00	1200.00	PENDIENTE_ACTIVACION	11111111-1111-1111-1111-111111111111	3	2025-12-24 15:13:27.734293
49	1	Venta a crédito	1200.00	1200.00	PENDIENTE_ACTIVACION	11111111-1111-1111-1111-111111111111	3	2025-12-24 15:13:42.525536
50	1	Venta a crédito	1200.00	1200.00	PENDIENTE_ACTIVACION	11111111-1111-1111-1111-111111111111	3	2025-12-24 15:14:13.944466
102	8	The Collection Snowboard: Hydrogen (x1)	600.00	0.00	PAGADO	c4625125-3722-490c-94e0-008f00dc6e9a	0	2026-03-13 00:17:49.9319
51	1	Venta a crédito	1200.00	1200.00	PENDIENTE_ACTIVACION	11111111-1111-1111-1111-111111111111	3	2025-12-24 15:14:21.166873
53	1	Venta a crédito	1200.00	1200.00	PENDIENTE_ACTIVACION	11111111-1111-1111-1111-111111111111	3	2025-12-24 15:21:24.609492
54	1	Venta a crédito	1000.00	1000.00	PENDIENTE_ACTIVACION	11111111-1111-1111-1111-111111111111	3	2025-12-24 23:30:31.023284
52	1	Venta a crédito	1200.00	400.00	EN_PROGRESO	11111111-1111-1111-1111-111111111111	3	2025-12-24 15:18:26.432328
55	1	xxx	400.00	400.00	PENDIENTE_ACTIVACION	11111111-1111-1111-1111-111111111111	1	2025-12-28 22:52:56.530313
56	1	xxx	400.00	400.00	PENDIENTE_ACTIVACION	11111111-1111-1111-1111-111111111111	4	2025-12-28 22:53:11.40092
107	8	Selling Plans Ski Wax (x5)	124.75	0.00	PAGADO	c4625125-3722-490c-94e0-008f00dc6e9a	0	2026-03-24 03:34:17.037398
108	8	The Complete Snowboard (x1)	699.95	0.00	PAGADO	c4625125-3722-490c-94e0-008f00dc6e9a	0	2026-03-24 03:55:36.988262
59	5	The Collection Snowboard: Hydrogen (x2)	1200.00	1200.00	PENDIENTE_ACTIVACION	11111111-1111-1111-1111-111111111111	1	2026-02-25 04:05:30.164258
60	6	string	0.00	0.00	PENDIENTE_ACTIVACION	11111111-1111-1111-1111-111111111111	0	2026-02-25 16:02:53.075142
109	8	The Minimal Snowboard (x1)	885.95	0.00	PAGADO	c4625125-3722-490c-94e0-008f00dc6e9a	0	2026-03-24 04:05:36.34712
61	6	string	0.00	0.00	PENDIENTE_ACTIVACION	11111111-1111-1111-1111-111111111111	0	2026-02-25 16:03:22.571381
62	6	string	0.00	0.00	PENDIENTE_ACTIVACION	11111111-1111-1111-1111-111111111111	0	2026-02-25 16:08:36.172919
63	6	string	0.00	0.00	PENDIENTE_ACTIVACION	11111111-1111-1111-1111-111111111111	0	2026-02-25 16:08:49.379085
64	4	string	0.00	0.00	PENDIENTE_ACTIVACION	11111111-1111-1111-1111-111111111111	0	2026-02-25 16:09:12.922881
65	4	string	0.00	0.00	PENDIENTE_ACTIVACION	11111111-1111-1111-1111-111111111111	0	2026-02-25 16:09:28.528781
66	6	string	0.00	0.00	PENDIENTE_ACTIVACION	11111111-1111-1111-1111-111111111111	0	2026-02-25 17:18:51.956776
\.


--
-- Data for Name: customers; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.customers (id, full_name, merchant_id, shopify_customer_id, favorable_balance, punctuality_score, email, phone) FROM stdin;
1	María Pérez	11111111-1111-1111-1111-111111111111	1234567890	0.00	\N	\N	\N
2	Sol Pérez	11111111-1111-1111-1111-111111111111	55555	0.00	\N	\N	\N
3	Shopify Customer 9731733946684	11111111-1111-1111-1111-111111111111	9731733946684	0.00	\N	\N	\N
4	Shopify Customer 1	11111111-1111-1111-1111-111111111111	1	0.00	\N	\N	\N
5	Shopify Customer 9731733979452	11111111-1111-1111-1111-111111111111	9731733979452	0.00	\N	\N	\N
6	Shopify Customer 0	11111111-1111-1111-1111-111111111111	0	0.00	\N	\N	\N
9	Karine Ruby	c4625125-3722-490c-94e0-008f00dc6e9a	9731733913916	0.00	\N	karine.ruby@example.com	\N
7	Russell Winfield	c4625125-3722-490c-94e0-008f00dc6e9a	9731733946684	0.00	\N	Russel.winfield@example.com	\N
8	Ayumu Hirano	c4625125-3722-490c-94e0-008f00dc6e9a	9731733979452	28.95	100.00	abrahampruebasespeciales@gmail.com	\N
\.


--
-- Data for Name: merchants; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.merchants (id, shop_domain, access_token, pago_movil_settings, transferencia_settings) FROM stdin;
11111111-1111-1111-1111-111111111111	placeholder.myshopify.com	\N	\N	\N
c4625125-3722-490c-94e0-008f00dc6e9a	opentech-credit-app-test.myshopify.com	\N	{"ci": "30212172", "banco": "(0134) BANESCO BANCO UNIVERSAL, C.A.", "numero": null, "tipoCi": "V", "telefono": "04160129986"}	{"ci": "30212172", "banco": "(0102) BANCO DE VENEZUELA, S.A. BANCO UNIVERSAL", "numero": "0102050465332445", "tipoCi": "V", "telefono": null}
855e75f9-bf67-4cd7-b765-8b55385aee54	test.myshopify.com	\N	\N	\N
\.


--
-- Data for Name: payment_proofs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.payment_proofs (id, token_id, reference_number, bank_name, amount, notes, submitted_at, status) FROM stdin;
9	070813e6-5c13-4ab7-a4b9-a1c4792f4075	1231313253128	(0108) BANCO PROVINCIAL, S.A. BANCO UNIVERSAL	124.75	Doc: V-4565558 | Teléf: 04124557541	2026-03-24 03:38:53.87818	PENDIENTE
\.


--
-- Data for Name: payment_tokens; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.payment_tokens (id, token, payment_id, merchant_id, customer_email, expires_at, used_at, created_at) FROM stdin;
8b4d1707-39c3-4488-9553-8c02321c509f	d8f5e24e-bd09-48cb-aaba-dd8d14b8847f	62	c4625125-3722-490c-94e0-008f00dc6e9a	abrahampruebasespeciales@gmail.com	2026-03-16 00:18:02.834371	2026-03-13 00:18:40.796157	2026-03-13 00:18:02.842749
070813e6-5c13-4ab7-a4b9-a1c4792f4075	aaf7cfbc-8af7-4f58-9938-c8d4e714c607	67	c4625125-3722-490c-94e0-008f00dc6e9a	abrahampruebasespeciales@gmail.com	2026-03-27 03:37:10.326119	2026-03-24 03:38:53.733683	2026-03-24 03:37:10.331713
\.


--
-- Data for Name: payments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.payments (id, credit_id, installment_id, amount, reference_number, payment_date, created_at, payment_method, merchant_id, status, reviewed_at, reviewed_by, notes, updated_at, punctuality_value, installments_covered) FROM stdin;
1	52	62	400.00	TRX-123456789	2025-12-24 17:31:43.455641	2025-12-24 17:31:43.463615	BANK	11111111-1111-1111-1111-111111111111	RECHAZADO	\N	\N	\N	2025-12-24 17:31:43.463615	\N	\N
4	52	62	400.00	REF-TEST-002	2025-12-25 01:57:28.020721	2025-12-25 01:57:28.027743	BANK	11111111-1111-1111-1111-111111111111	APROBADO	\N	\N	\N	2025-12-25 01:57:28.027743	\N	\N
5	52	\N	300.00	REF-TEST-001	2025-12-27 17:43:41.15328	2025-12-27 17:43:41.156273	BANK	11111111-1111-1111-1111-111111111111	EN_REVISION	\N	\N	\N	2025-12-27 17:43:41.156273	\N	\N
6	52	62	400.00	REF-123456	2025-12-28 00:37:20.712654	2025-12-28 00:37:20.714651	BANK	11111111-1111-1111-1111-111111111111	EN_REVISION	\N	\N	\N	2025-12-28 00:37:20.714651	\N	\N
12	56	72	0.00	string	2025-12-28 22:56:02.293367	2025-12-28 22:56:02.293367	BANK	11111111-1111-1111-1111-111111111111	EN_REVISION	\N	\N	\N	2025-12-28 22:56:02.293367	\N	\N
2	52	62	400.00	TRX-123456789-FIX2	2025-12-24 17:31:50.345746	2025-12-24 17:31:50.346744	BANK	11111111-1111-1111-1111-111111111111	APROBADO	\N	\N	\N	2025-12-24 17:31:50.346744	\N	\N
3	52	62	400.00	TRX-123456789-FIX3	2025-12-24 17:56:47.594719	2025-12-24 17:56:47.598709	BANK	11111111-1111-1111-1111-111111111111	RECHAZADO	\N	\N	\N	2025-12-24 17:56:47.598709	\N	\N
7	52	62	400.00	REF-123456-FIX7	2025-12-28 00:38:27.109103	2025-12-28 00:38:27.11213	BANK	11111111-1111-1111-1111-111111111111	EN_REVISION	\N	\N	\N	2025-12-28 00:38:27.11213	\N	\N
8	52	62	400.00	REF-123456-FIX8	2025-12-28 00:39:35.641602	2025-12-28 00:39:35.643594	BANK	11111111-1111-1111-1111-111111111111	EN_REVISION	\N	\N	\N	2025-12-28 00:39:35.643594	\N	\N
9	52	62	400.00	REF-123456-FIX9	2025-12-28 00:50:07.48601	2025-12-28 00:50:07.489001	BANK	11111111-1111-1111-1111-111111111111	EN_REVISION	\N	\N	\N	2025-12-28 00:50:07.489001	\N	\N
10	52	62	400.00	REF-123456-FIX10	2025-12-28 00:53:56.734233	2025-12-28 00:53:56.73822	BANK	11111111-1111-1111-1111-111111111111	EN_REVISION	\N	\N	\N	2025-12-28 00:53:56.73822	\N	\N
11	52	62	400.00	REF-123456-FIX11	2025-12-28 00:56:08.465216	2025-12-28 00:56:08.467212	BANK	11111111-1111-1111-1111-111111111111	EN_REVISION	\N	\N	\N	2025-12-28 00:56:08.467212	\N	\N
62	102	\N	600.00	1231313253121	2026-03-13 00:18:02.682987	2026-03-13 00:18:02.683899	(0105) BANCO MERCANTIL C.A., BANCO UNIVERSAL	c4625125-3722-490c-94e0-008f00dc6e9a	RECHAZADO	2026-03-13 00:19:32.485038	c4625125-3722-490c-94e0-008f00dc6e9a	Doc: V-30212172 | Teléf: 04124557541 | Extra: pago abono	2026-03-13 00:18:40.797154	\N	\N
63	102	\N	700.00	EFECTIVO-1773361266196	2026-03-13 00:21:06.276555	2026-03-13 00:21:06.277552	BANK	c4625125-3722-490c-94e0-008f00dc6e9a	APROBADO	2026-03-13 00:21:06.300425	c4625125-3722-490c-94e0-008f00dc6e9a	[DISTRIBUTE_EXCESS]	2026-03-13 00:21:06.277552	\N	\N
67	107	\N	124.75	1231313253128	2026-03-24 03:37:09.921238	2026-03-24 03:37:09.92323	(0108) BANCO PROVINCIAL, S.A. BANCO UNIVERSAL	c4625125-3722-490c-94e0-008f00dc6e9a	EN_REVISION	\N	\N	Doc: V-4565558 | Teléf: 04124557541	2026-03-24 03:38:53.733683	\N	\N
68	107	\N	124.75	EFECTIVO-1774324378596	2026-03-24 03:52:58.65893	2026-03-24 03:52:58.659928	BANK	c4625125-3722-490c-94e0-008f00dc6e9a	APROBADO	2026-03-24 03:52:58.778459	c4625125-3722-490c-94e0-008f00dc6e9a	[DISTRIBUTE_EXCESS]	2026-03-24 03:52:58.659928	100.00	\N
69	108	\N	699.95	4444444444442	2026-03-24 03:58:38.797668	2026-03-24 03:58:38.798674	PAGO_MOVIL	c4625125-3722-490c-94e0-008f00dc6e9a	APROBADO	2026-03-24 03:58:39.038355	c4625125-3722-490c-94e0-008f00dc6e9a	[DISTRIBUTE_EXCESS]	2026-03-24 03:58:38.798674	100.00	\N
70	109	\N	889.95	EFECTIVO-1774325357705	2026-03-24 04:09:17.715913	2026-03-24 04:09:17.716912	BANK	c4625125-3722-490c-94e0-008f00dc6e9a	APROBADO	2026-03-24 04:09:17.79023	c4625125-3722-490c-94e0-008f00dc6e9a	[DISTRIBUTE_EXCESS]	2026-03-24 04:09:17.716912	100.00	\N
\.


--
-- Name: audit_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.audit_logs_id_seq', 62, true);


--
-- Name: credit_history_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.credit_history_id_seq', 149, true);


--
-- Name: credit_installments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.credit_installments_id_seq', 120, true);


--
-- Name: credit_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.credit_items_id_seq', 32, true);


--
-- Name: credits_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.credits_id_seq', 109, true);


--
-- Name: customers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.customers_id_seq', 9, true);


--
-- Name: payment_proofs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.payment_proofs_id_seq', 9, true);


--
-- Name: payments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.payments_id_seq', 70, true);


--
-- Name: Session Session_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Session"
    ADD CONSTRAINT "Session_pkey" PRIMARY KEY (id);


--
-- Name: alembic_version alembic_version_pkc; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alembic_version
    ADD CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: credit_history credit_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.credit_history
    ADD CONSTRAINT credit_history_pkey PRIMARY KEY (id);


--
-- Name: credit_installments credit_installments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.credit_installments
    ADD CONSTRAINT credit_installments_pkey PRIMARY KEY (id);


--
-- Name: credit_items credit_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.credit_items
    ADD CONSTRAINT credit_items_pkey PRIMARY KEY (id);


--
-- Name: credits credits_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.credits
    ADD CONSTRAINT credits_pkey PRIMARY KEY (id);


--
-- Name: customers customers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_pkey PRIMARY KEY (id);


--
-- Name: merchants merchants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.merchants
    ADD CONSTRAINT merchants_pkey PRIMARY KEY (id);


--
-- Name: merchants merchants_shop_domain_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.merchants
    ADD CONSTRAINT merchants_shop_domain_key UNIQUE (shop_domain);


--
-- Name: payment_proofs payment_proofs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_proofs
    ADD CONSTRAINT payment_proofs_pkey PRIMARY KEY (id);


--
-- Name: payment_tokens payment_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_tokens
    ADD CONSTRAINT payment_tokens_pkey PRIMARY KEY (id);


--
-- Name: payment_tokens payment_tokens_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_tokens
    ADD CONSTRAINT payment_tokens_token_key UNIQUE (token);


--
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);


--
-- Name: payments uq_payment_reference; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT uq_payment_reference UNIQUE (merchant_id, reference_number);


--
-- Name: idx_dashboard_metrics_mv_merchant; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_dashboard_metrics_mv_merchant ON public.dashboard_metrics_mv USING btree (merchant_id);


--
-- Name: idx_dashboard_metrics_mv_refreshed; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dashboard_metrics_mv_refreshed ON public.dashboard_metrics_mv USING btree (refreshed_at);


--
-- Name: ix_audit_logs_action; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_audit_logs_action ON public.audit_logs USING btree (action);


--
-- Name: ix_audit_logs_entity_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_audit_logs_entity_id ON public.audit_logs USING btree (entity_id);


--
-- Name: ix_audit_logs_entity_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_audit_logs_entity_name ON public.audit_logs USING btree (entity_name);


--
-- Name: ix_credit_history_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_credit_history_id ON public.credit_history USING btree (id);


--
-- Name: ix_credit_installments_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_credit_installments_id ON public.credit_installments USING btree (id);


--
-- Name: ix_credit_items_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_credit_items_id ON public.credit_items USING btree (id);


--
-- Name: ix_credit_items_product_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_credit_items_product_id ON public.credit_items USING btree (product_id);


--
-- Name: ix_credits_customer_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_credits_customer_id ON public.credits USING btree (customer_id);


--
-- Name: ix_credits_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_credits_id ON public.credits USING btree (id);


--
-- Name: ix_credits_merchant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_credits_merchant_id ON public.credits USING btree (merchant_id);


--
-- Name: ix_customers_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_customers_id ON public.customers USING btree (id);


--
-- Name: ix_customers_merchant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_customers_merchant_id ON public.customers USING btree (merchant_id);


--
-- Name: ix_customers_shopify_customer_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_customers_shopify_customer_id ON public.customers USING btree (shopify_customer_id);


--
-- Name: ix_payments_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_payments_id ON public.payments USING btree (id);


--
-- Name: credit_history credit_history_credit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.credit_history
    ADD CONSTRAINT credit_history_credit_id_fkey FOREIGN KEY (credit_id) REFERENCES public.credits(id);


--
-- Name: credit_installments credit_installments_credit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.credit_installments
    ADD CONSTRAINT credit_installments_credit_id_fkey FOREIGN KEY (credit_id) REFERENCES public.credits(id) ON DELETE CASCADE;


--
-- Name: credit_items credit_items_credit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.credit_items
    ADD CONSTRAINT credit_items_credit_id_fkey FOREIGN KEY (credit_id) REFERENCES public.credits(id) ON DELETE CASCADE;


--
-- Name: credits credits_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.credits
    ADD CONSTRAINT credits_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id);


--
-- Name: credits credits_merchant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.credits
    ADD CONSTRAINT credits_merchant_id_fkey FOREIGN KEY (merchant_id) REFERENCES public.merchants(id);


--
-- Name: customers customers_merchant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_merchant_id_fkey FOREIGN KEY (merchant_id) REFERENCES public.merchants(id);


--
-- Name: payment_proofs payment_proofs_token_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_proofs
    ADD CONSTRAINT payment_proofs_token_id_fkey FOREIGN KEY (token_id) REFERENCES public.payment_tokens(id) ON DELETE CASCADE;


--
-- Name: payment_tokens payment_tokens_merchant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_tokens
    ADD CONSTRAINT payment_tokens_merchant_id_fkey FOREIGN KEY (merchant_id) REFERENCES public.merchants(id) ON DELETE CASCADE;


--
-- Name: payment_tokens payment_tokens_payment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_tokens
    ADD CONSTRAINT payment_tokens_payment_id_fkey FOREIGN KEY (payment_id) REFERENCES public.payments(id) ON DELETE CASCADE;


--
-- Name: payments payments_credit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_credit_id_fkey FOREIGN KEY (credit_id) REFERENCES public.credits(id) ON DELETE CASCADE;


--
-- Name: payments payments_installment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_installment_id_fkey FOREIGN KEY (installment_id) REFERENCES public.credit_installments(id) ON DELETE CASCADE;


--
-- Name: dashboard_metrics_mv; Type: MATERIALIZED VIEW DATA; Schema: public; Owner: -
--

REFRESH MATERIALIZED VIEW public.dashboard_metrics_mv;


--
-- PostgreSQL database dump complete
--

\unrestrict lbM8Q9s72FC5Er7faKJEiDMswIvOGCOQ9lLOccONYI22HlrViF5Sarm72ps9gMy

