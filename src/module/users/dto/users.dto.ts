import { IsDateString, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { EUserStatus } from '../enums/user.enum';
import { Type } from 'class-transformer';

export class GetUsersQueryDto {
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
}

export class UpdateUserStatusDto {
  @IsEnum(EUserStatus)
  status: EUserStatus;
}

export class UpdateProfileDto {
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  fullName?: string;

  @IsString()
  @IsOptional()
  phone?: string | null;

  @IsString()
  @IsOptional()
  gender?: string | null;

  @IsDateString()
  @IsOptional()
  dateOfBirth?: string | null;
}
