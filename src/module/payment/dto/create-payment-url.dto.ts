import { IsNumber, IsNotEmpty, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { EPaymentMethod } from '../enums/payment.enum';

export class CreatePaymentUrlDto {
  @Type(() => Number)
  @IsNumber()
  @IsNotEmpty()
  bookingId: number;

  @IsEnum(EPaymentMethod)
  @IsNotEmpty()
  method: EPaymentMethod;
}
