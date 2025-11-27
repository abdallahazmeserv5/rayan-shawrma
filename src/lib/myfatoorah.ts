// MyFatoorah Payment Gateway Integration

interface PaymentData {
  amount: number
  currency: string
  customerName: string
  customerPhone: string
  callbackUrl: string
  errorUrl: string
  orderReference: string
}

interface PaymentResponse {
  invoiceId: string
  paymentUrl: string
}

interface PaymentStatus {
  invoiceId: string
  status: 'pending' | 'success' | 'failed' | 'cancelled'
  amount: number
  paidAmount?: number
  transactionId?: string
}

export class MyFatoorahClient {
  private apiKey: string
  private testMode: boolean
  private baseUrl: string

  constructor(apiKey: string, testMode: boolean = true) {
    this.apiKey = apiKey
    this.testMode = testMode
    // Use test or live URL based on mode
    this.baseUrl = testMode ? 'https://apitest.myfatoorah.com' : 'https://api.myfatoorah.com'
  }

  private async request(endpoint: string, method: string = 'POST', body?: any) {
    const url = `${this.baseUrl}${endpoint}`

    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(
        `MyFatoorah API Error: ${response.status} - ${error.Message || response.statusText}`,
      )
    }

    return response.json()
  }

  async initiatePayment(data: PaymentData): Promise<PaymentResponse> {
    try {
      const payload = {
        InvoiceAmount: data.amount,
        CurrencyIso: data.currency,
        CustomerName: data.customerName,
        CustomerMobile: data.customerPhone,
        CallBackUrl: data.callbackUrl,
        ErrorUrl: data.errorUrl,
        CustomerReference: data.orderReference,
        DisplayCurrencyIso: data.currency,
        Language: 'ar', // Default to Arabic, can be made configurable
      }

      const response = await this.request('/v2/ExecutePayment', 'POST', payload)

      if (!response.IsSuccess) {
        throw new Error(response.Message || 'Payment initiation failed')
      }

      return {
        invoiceId: response.Data.InvoiceId.toString(),
        paymentUrl: response.Data.PaymentURL,
      }
    } catch (error) {
      console.error('MyFatoorah initiate payment error:', error)
      throw error
    }
  }

  async getPaymentStatus(invoiceId: string): Promise<PaymentStatus> {
    try {
      const payload = {
        Key: invoiceId,
        KeyType: 'InvoiceId',
      }

      const response = await this.request('/v2/GetPaymentStatus', 'POST', payload)

      if (!response.IsSuccess) {
        throw new Error(response.Message || 'Failed to get payment status')
      }

      const data = response.Data
      let status: PaymentStatus['status'] = 'pending'

      // Map MyFatoorah status to our status
      if (data.InvoiceStatus === 'Paid') {
        status = 'success'
      } else if (data.InvoiceStatus === 'Failed' || data.InvoiceStatus === 'Expired') {
        status = 'failed'
      } else if (data.InvoiceStatus === 'Cancelled') {
        status = 'cancelled'
      }

      return {
        invoiceId: data.InvoiceId.toString(),
        status,
        amount: data.InvoiceValue,
        paidAmount: data.PaidAmount,
        transactionId: data.InvoiceTransactions?.[0]?.TransactionId,
      }
    } catch (error) {
      console.error('MyFatoorah get payment status error:', error)
      throw error
    }
  }

  verifyWebhookSignature(payload: any, signature: string): boolean {
    // MyFatoorah webhook verification
    // Note: Implement proper signature verification based on MyFatoorah documentation
    // For now, we'll do basic validation
    try {
      if (!signature || !payload) {
        return false
      }

      // TODO: Implement actual signature verification
      // This is a placeholder - check MyFatoorah docs for proper implementation
      return true
    } catch (error) {
      console.error('Webhook signature verification error:', error)
      return false
    }
  }
}
