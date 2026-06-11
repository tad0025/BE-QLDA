import { IsArray, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { ConcessionItemDto } from './booking.dto';

export class UpdateBookingConcessionsDto {
  @IsArray()
  @IsOptional()
  @Type(() => ConcessionItemDto)
  concessions?: ConcessionItemDto[];
}
