import { IsNumber, IsNotEmpty, IsEnum, IsOptional } from 'class-validator';
import { ESeatType } from '../enums/cinema.enum';

export class GenerateSeatsDto {
  @IsNumber()
  @IsNotEmpty()
  rows: number;

  @IsNumber()
  @IsNotEmpty()
  columns: number;

  @IsEnum(ESeatType)
  @IsOptional()
  defaultSeatType?: ESeatType;
}
