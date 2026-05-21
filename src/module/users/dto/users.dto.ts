import { IsOptional, IsEnum, IsNumber, Min } from 'class-validator';
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
