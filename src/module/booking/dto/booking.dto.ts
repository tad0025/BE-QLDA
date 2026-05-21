import { IsNumber, IsNotEmpty, IsArray, IsOptional, IsString, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { EBookingSource } from '../enums/booking.enum';

export class HoldSeatsDto {
  @Type(() => Number)
  @IsNumber()
  @IsNotEmpty()
  showtimeId: number;

  @IsArray()
  @IsNumber({}, { each: true })
  @IsNotEmpty()
  seatIds: number[];
}

export class ConcessionItemDto {
  @Type(() => Number)
  @IsNumber()
  @IsNotEmpty()
  productId: number;

  @Type(() => Number)
  @IsNumber()
  @IsNotEmpty()
  quantity: number;
}

export class CreateBookingDto {
  @Type(() => Number)
  @IsNumber()
  @IsNotEmpty()
  showtimeId: number;

  @IsArray()
  @IsNumber({}, { each: true })
  @IsNotEmpty()
  seatIds: number[];

  @IsArray()
  @IsOptional()
  @Type(() => ConcessionItemDto)
  concessions?: ConcessionItemDto[];

  @IsString()
  @IsOptional()
  promotionCode?: string;

  @IsEnum(EBookingSource)
  @IsOptional()
  source?: EBookingSource;
}
