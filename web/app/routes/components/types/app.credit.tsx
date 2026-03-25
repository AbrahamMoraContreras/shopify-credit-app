import type { UUID } from 'crypto';

export interface Credit {
  customer_id: number;
  customer_name: string;
  customer_reputation: string;
  customer_document: string;
  customer_document_id: string;
  customer_extra: string | null;
  concept: string;
  total_amount: number;
  balance: number;
  status: string;
  merchant_id: UUID;
  invoice_code: string;
  installments_count: number;
  created_at: string; // ISO datetime
  updated_at: string; // ISO datetime
}

/*   interface CustomerData {
    customer_id: number;
    customer_document: string;
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
  } */