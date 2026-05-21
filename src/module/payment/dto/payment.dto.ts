import { IsNumber, IsNotEmpty, IsEnum, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { EPaymentMethod, EPaymentChannel } from '../enums/payment.enum';

export class MockPaymentDto {
  @Type(() => Number)
  @IsNumber()
  @IsNotEmpty()
  bookingId: number;

  @IsEnum(EPaymentMethod)
  @IsOptional()
  method?: EPaymentMethod;

  @IsEnum(EPaymentChannel)
  @IsOptional()
  channel?: EPaymentChannel;
}
