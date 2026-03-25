export type PaymentFrequency = 'quincenal' | 'mensual';

export interface CreditFormState {
    customer: '',
    customer_id: '',
    customer_reputation: '',
    customer_document: '',
    total_credit_amount: '',
    payMethod: '',
    exchange_rate: '',
    datepay: '',
    first_payment_date: '',
    frequency: PaymentFrequency,
    installment_number: '',
    installment_amount: ''
  }