import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { ENV_VARS } from '../../../constants/env.constants';

@Injectable()
export class PaypalService {
  private readonly logger = new Logger(PaypalService.name);
  private readonly baseUrl: string;

  constructor(private readonly configService: ConfigService) {
    const env = this.configService.get<string>(ENV_VARS.PAYPAL_ENVIRONMENT) || 'sandbox';
    this.baseUrl = env === 'sandbox'
      ? 'https://api-m.sandbox.paypal.com'
      : 'https://api-m.paypal.com';
  }

  private getRequiredEnv(key: string): string {
    const value = this.configService.get<string>(key);
    if (!value) throw new InternalServerErrorException(`Thiếu biến môi trường: ${key}`);
    return value;
  }

  private async getAccessToken(): Promise<string> {
    const clientId = this.getRequiredEnv(ENV_VARS.PAYPAL_CLIENT_ID);
    const clientSecret = this.getRequiredEnv(ENV_VARS.PAYPAL_CLIENT_SECRET);
    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    const response = await fetch(`${this.baseUrl}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });

    const data = await response.json();
    if (!response.ok) {
      this.logger.error('PayPal getAccessToken failed', data);
      throw new InternalServerErrorException('Không thể kết nối đến PayPal');
    }

    return data.access_token;
  }

  async buildPaymentUrl(bookingCode: string, totalAmountVND: number): Promise<{ approveUrl: string; paypalOrderId: string }> {
    const accessToken = await this.getAccessToken();
    const returnUrl = this.getRequiredEnv(ENV_VARS.PAYPAL_RETURN_URL);
    const cancelUrl = this.getRequiredEnv(ENV_VARS.PAYPAL_CANCEL_URL);

    const amountUSD = (totalAmountVND / 25000).toFixed(2);

    const requestBody = {
      intent: 'CAPTURE',
      purchase_units: [
        {
          reference_id: bookingCode,
          amount: {
            currency_code: 'USD',
            value: amountUSD,
          },
        },
      ],
      payment_source: {
        paypal: {
          experience_context: {
            payment_method_preference: 'IMMEDIATE_PAYMENT_REQUIRED',
            brand_name: 'Cinema Booking',
            locale: 'vi-VN',
            landing_page: 'LOGIN',
            user_action: 'PAY_NOW',
            return_url: `${returnUrl}?bookingCode=${bookingCode}`,
            cancel_url: `${cancelUrl}?bookingCode=${bookingCode}`,
          },
        },
      },
    };

    const response = await fetch(`${this.baseUrl}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();
    if (!response.ok) {
      this.logger.error('PayPal createOrder failed', data);
      throw new InternalServerErrorException('Tạo đơn hàng PayPal thất bại');
    }

    const approveLink = data.links?.find((link: any) => link.rel === 'payer-action');
    if (!approveLink) {
      throw new InternalServerErrorException('PayPal không trả về approve link');
    }

    return { approveUrl: approveLink.href, paypalOrderId: data.id };
  }

  async captureOrder(paypalOrderId: string): Promise<boolean> {
    const accessToken = await this.getAccessToken();

    const response = await fetch(`${this.baseUrl}/v2/checkout/orders/${paypalOrderId}/capture`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    if (!response.ok) {
      this.logger.error('PayPal captureOrder failed', data);
      return false;
    }

    return data.status === 'COMPLETED';
  }
}
