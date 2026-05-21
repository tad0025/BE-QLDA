import { IsString, IsOptional, IsEnum, IsNotEmpty } from 'class-validator';
import { ECinemaStatus } from '../enums/cinema.enum';

export class CreateCinemaDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  address: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  email?: string;

  @IsEnum(ECinemaStatus)
  @IsOptional()
  status?: ECinemaStatus;
}

export class UpdateCinemaDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  email?: string;

  @IsEnum(ECinemaStatus)
  @IsOptional()
  status?: ECinemaStatus;
}
