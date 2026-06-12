import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { ENV_VARS } from '../../../constants/env.constants';

@Injectable()
export class VnpayService {
  private readonly logger = new Logger(VnpayService.name);

  constructor(private readonly configService: ConfigService) {}

  private getRequiredEnv(key: string): string {
    const value = this.configService.get<string>(key);
    if (!value) throw new InternalServerErrorException(`Thiếu biến môi trường: ${key}`);
    return value;
  }

  private sortObject(obj: Record<string, any>): Record<string, string> {
    const sorted: Record<string, string> = {};
    const keys = Object.keys(obj).sort();
    for (const key of keys) {
      sorted[encodeURIComponent(key)] = encodeURIComponent(String(obj[key])).replace(/%20/g, '+');
    }
    return sorted;
  }

  buildPaymentUrl(bookingCode: string, totalAmount: number, ipAddr: string): string {
    const tmnCode = this.getRequiredEnv(ENV_VARS.VNP_TMN_CODE);
    const secretKey = this.getRequiredEnv(ENV_VARS.VNP_HASH_SECRET);
    const vnpUrl = this.getRequiredEnv(ENV_VARS.VNP_URL);
    const returnUrl = this.getRequiredEnv(ENV_VARS.VNP_RETURN_URL);

    const now = new Date();
    const createDate = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, '0'),
      String(now.getDate()).padStart(2, '0'),
      String(now.getHours()).padStart(2, '0'),
      String(now.getMinutes()).padStart(2, '0'),
      String(now.getSeconds()).padStart(2, '0'),
    ].join('');

    const vnp_Params: Record<string, any> = {
      vnp_Version: '2.1.0',
      vnp_Command: 'pay',
      vnp_TmnCode: tmnCode,
      vnp_Locale: 'vn',
      vnp_CurrCode: 'VND',
      vnp_TxnRef: bookingCode,
      vnp_OrderInfo: `Thanh toan ve xem phim ${bookingCode}`,
      vnp_OrderType: 'other',
      vnp_Amount: Math.round(totalAmount * 100),
      vnp_ReturnUrl: returnUrl,
      vnp_IpAddr: ipAddr || '127.0.0.1',
      vnp_CreateDate: createDate,
    };

    const sortedParams = this.sortObject(vnp_Params);
    const signData = Object.keys(sortedParams)
      .map((k) => `${k}=${sortedParams[k]}`)
      .join('&');

    const signed = crypto
      .createHmac('sha512', secretKey)
      .update(Buffer.from(signData, 'utf-8'))
      .digest('hex');

    sortedParams['vnp_SecureHash'] = signed;

    const queryString = Object.keys(sortedParams)
      .map((k) => `${k}=${sortedParams[k]}`)
      .join('&');

    return `${vnpUrl}?${queryString}`;
  }

  verifyIpnSignature(query: Record<string, any>): boolean {
    try {
      const secretKey = this.getRequiredEnv(ENV_VARS.VNP_HASH_SECRET);

      const params = { ...query };
      const secureHash = params['vnp_SecureHash'];
      delete params['vnp_SecureHash'];
      delete params['vnp_SecureHashType'];

      const sortedParams = this.sortObject(params);
      const signData = Object.keys(sortedParams)
        .map((k) => `${k}=${sortedParams[k]}`)
        .join('&');

      const signed = crypto
        .createHmac('sha512', secretKey)
        .update(Buffer.from(signData, 'utf-8'))
        .digest('hex');

      if (secureHash !== signed) {
        this.logger.warn(`VNPay IPN signature mismatch. Expected: ${signed}, Got: ${secureHash}`);
        return false;
      }

      return true;
    } catch {
      return false;
    }
  }
}
