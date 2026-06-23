import { IsString, IsNotEmpty, IsNumber, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateConcessionProductDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @Type(() => Number)
  @IsNumber()
  @IsNotEmpty()
  price: number;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  @Min(0)
  stockQuantity?: number;
}

export class UpdateConcessionProductDto {
  @IsString()
  @IsOptional()
  name?: string;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  price?: number;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  @Min(0)
  stockQuantity?: number;
}
