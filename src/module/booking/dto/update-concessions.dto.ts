import { IsArray, IsOptional, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';
import { ConcessionItemDto } from './booking.dto';

export class UpdateBookingConcessionsDto {
  @IsArray()
  @IsOptional()
  @Type(() => ConcessionItemDto)
  concessions?: ConcessionItemDto[];

  @IsNumber()
  @IsOptional()
  pointsToUse?: number;

  @IsNumber()
  @IsOptional()
  redeemConcessionId?: number;
}