import { IsString, IsOptional, IsEnum, IsNotEmpty, IsEmail, Matches, MaxLength, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ECinemaStatus } from '../enums/cinema.enum';

export class CreateCinemaDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  address: string;

  @IsString()
  @IsOptional()
  @Matches(/^\+?[0-9]{8,15}$/, { message: 'Số điện thoại không hợp lệ' })
  phone?: string;

  @IsEmail()
  @IsOptional()
  @MaxLength(120)
  email?: string;

  @IsEnum(ECinemaStatus)
  @IsOptional()
  status?: ECinemaStatus;
}

export class UpdateCinemaDto {
  @IsString()
  @IsOptional()
  @MaxLength(120)
  name?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  address?: string;

  @IsString()
  @IsOptional()
  @Matches(/^\+?[0-9]{8,15}$/, { message: 'Số điện thoại không hợp lệ' })
  phone?: string;

  @IsEmail()
  @IsOptional()
  @MaxLength(120)
  email?: string;

  @IsEnum(ECinemaStatus)
  @IsOptional()
  status?: ECinemaStatus;
}

export class GetCinemasQueryDto {
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  @Min(1)
  page?: number = 1;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  @Min(1)
  pageSize?: number = 10;

  @IsString()
  @IsOptional()
  @MaxLength(120)
  name?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  address?: string;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  phone?: string;

  @IsString()
  @IsOptional()
  @MaxLength(120)
  email?: string;
}
