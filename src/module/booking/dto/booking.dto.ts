import { IsNumber, IsNotEmpty, IsArray, IsOptional, IsString, IsEnum, Min } from 'class-validator';
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
  @Min(1)
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

  /**
   * Số điểm tích lũy muốn sử dụng để giảm giá đơn hàng.
   * 1 điểm = 1 VNĐ. Tối đa 20% tổng giá trị đơn hàng.
   */
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  @Min(0)
  pointsToUse?: number;

  /**
   * ID của sản phẩm combo muốn đổi bằng điểm tích lũy.
   * Nếu cung cấp, toàn bộ giá của combo đó sẽ được thanh toán bằng điểm.
   */
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  redeemConcessionId?: number;
}
