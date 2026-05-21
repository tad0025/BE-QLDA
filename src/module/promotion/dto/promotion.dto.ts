import { IsString, IsNotEmpty, IsNumber, IsOptional, IsEnum, IsBoolean, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { EDiscountType } from '../enums/promotion.enum';

export class CreatePromotionDto {
  @IsString()
  @IsNotEmpty()
  code: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(EDiscountType)
  @IsNotEmpty()
  discountType: EDiscountType;

  @Type(() => Number)
  @IsNumber()
  @IsNotEmpty()
  discountValue: number;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  movieId?: number;

  @IsDateString()
  @IsNotEmpty()
  startDate: string;

  @IsDateString()
  @IsNotEmpty()
  endDate: string;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  maxUsage?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdatePromotionDto {
  @IsString()
  @IsOptional()
  code?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(EDiscountType)
  @IsOptional()
  discountType?: EDiscountType;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  discountValue?: number;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  movieId?: number;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  maxUsage?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class CheckPromotionDto {
  @IsString()
  @IsNotEmpty()
  code: string;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  movieId?: number;
}
