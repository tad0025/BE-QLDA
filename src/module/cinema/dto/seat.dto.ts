import { IsNumber, IsNotEmpty, IsEnum, IsOptional } from 'class-validator';

export class GenerateSeatsDto {
  @IsNumber()
  @IsNotEmpty()
  rows: number;

  @IsNumber()
  @IsNotEmpty()
  columns: number;

}
