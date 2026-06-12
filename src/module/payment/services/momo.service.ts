import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { ENV_VARS } from '../../../constants/env.constants';

@Injectable()
export class MomoService {
  private readonly logger = new Logger(MomoService.name);

  constructor(private readonly configService: ConfigService) {}

  private getRequiredEnv(key: string): string {
    const value = this.configService.get<string>(key);
    if (!value) throw new InternalServerErrorException(`Thiếu biến môi trường: ${key}`);
    return value;
  }

  async buildPaymentUrl(bookingCode: string, totalAmount: number): Promise<string> {
    const partnerCode = this.getRequiredEnv(ENV_VARS.MOMO_PARTNER_CODE);
    const accessKey = this.getRequiredEnv(ENV_VARS.MOMO_ACCESS_KEY);
    const secretKey = this.getRequiredEnv(ENV_VARS.MOMO_SECRET_KEY);
    const endpoint = this.getRequiredEnv(ENV_VARS.MOMO_ENDPOINT);
    const redirectUrl = this.getRequiredEnv(ENV_VARS.MOMO_REDIRECT_URL);
    const ipnUrl = this.getRequiredEnv(ENV_VARS.MOMO_IPN_URL);

    const amount = Math.round(totalAmount).toString();
    const orderInfo = `Thanh toan ve xem phim ${bookingCode}`;
    const requestId = `${bookingCode}-${Date.now()}`;
    const extraData = '';
    const requestType = 'payWithMethod';

    const rawSignature = [
      `accessKey=${accessKey}`,
      `amount=${amount}`,
      `extraData=${extraData}`,
      `ipnUrl=${ipnUrl}`,
      `orderId=${bookingCode}`,
      `orderInfo=${orderInfo}`,
      `partnerCode=${partnerCode}`,
      `redirectUrl=${redirectUrl}`,
      `requestId=${requestId}`,
      `requestType=${requestType}`,
    ].join('&');

    const signature = crypto.createHmac('sha256', secretKey).update(rawSignature).digest('hex');

    const requestBody = {
      partnerCode,
      partnerName: 'Cinema Booking',
      storeId: 'cinema-store',
      requestId,
      amount: Number(amount),
      orderId: bookingCode,
      orderInfo,
      redirectUrl,
      ipnUrl,
      lang: 'vi',
      requestType,
      extraData,
      signature,
    };

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(JSON.stringify(requestBody)).toString(),
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (data.resultCode !== 0) {
        this.logger.error(`MoMo createOrder failed: ${data.message}`);
        throw new InternalServerErrorException(data.message || 'MoMo payment creation failed');
      }

      return data.payUrl;
    } catch (error) {
      if (error instanceof InternalServerErrorException) throw error;
      this.logger.error('MoMo connection error', error);
      throw new InternalServerErrorException('Không thể kết nối đến MoMo');
    }
  }

  verifyIpnSignature(ipnData: Record<string, any>): boolean {
    try {
      const accessKey = this.getRequiredEnv(ENV_VARS.MOMO_ACCESS_KEY);
      const secretKey = this.getRequiredEnv(ENV_VARS.MOMO_SECRET_KEY);

      const {
        partnerCode, orderId, requestId, amount, orderInfo, orderType,
        transId, resultCode, message, payType, responseTime, extraData,
        signature: reqSignature,
      } = ipnData;

      const rawSignature = [
        `accessKey=${accessKey}`,
        `amount=${amount}`,
        `extraData=${extraData}`,
        `message=${message}`,
        `orderId=${orderId}`,
        `orderInfo=${orderInfo}`,
        `orderType=${orderType}`,
        `partnerCode=${partnerCode}`,
        `payType=${payType}`,
        `requestId=${requestId}`,
        `responseTime=${responseTime}`,
        `resultCode=${resultCode}`,
        `transId=${transId}`,
      ].join('&');

      const signature = crypto.createHmac('sha256', secretKey).update(rawSignature).digest('hex');

      if (signature !== reqSignature) {
        this.logger.warn(`MoMo IPN signature mismatch. Expected: ${signature}, Got: ${reqSignature}`);
        return false;
      }

      return true;
    } catch {
      return false;
    }
  }
}
