import { UUID } from "crypto";

export interface Credit {
  id: number;
  customer_id: number;
  merchant_id: string;
  concept: string;
  invoice_code: string | null;
  total_amount: number;
  balance: number;
  last_payment_amount?: number | null;
  last_payment_notes?: string | null;
  installments_count: number;
  status: string;
  created_at: string;
  customer?: {
    id: number;
    full_name: string;
    email: string | null;
    phone: string | null;
    favorable_balance: number;
  };
  items?: CreditItem[];
}

export interface CreditItem {
  id: number;
  credit_id: number;
  product_id: string;
  product_code: string | null;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}


export interface DashboardData {
  totalDebt: number
  customersWithDebt: number
  credits: Credit[]
}

export interface CustomerSummary {
  customerName: string
  pendingOrders: number
  pendingDebt: number
  favorBalance: number
  totalOrders: number
}

export interface PaymentResponse {
  id: number;
  merchant_id: UUID;
  credit_id: number;
  installment_id: number;
  amount: number;
  payment_method: string;
  reference_number: string;
  status: PaymentStatus;
  installment_number: number;
  payment_date: string;
  reviewed_at: string;
  reviewed_by: UUID;
  notes: string;

  credit: Credit

  created_at: string;
  updated_at: string;
}


export type PaymentStatus = "REGISTRADO" | "APROBADO" | "RECHAZADO" | "EN_REVISION" | "CANCELADO";

export type PaymentMethod = "BANK" | "PAYPAL" | "PAGO_MOVIL";