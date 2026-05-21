import { IsString, IsOptional, IsEnum, IsNotEmpty, IsNumber } from 'class-validator';
import { ERoomType, ERoomStatus } from '../enums/cinema.enum';

export class CreateRoomDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsNumber()
  @IsNotEmpty()
  totalSeats: number;

  @IsEnum(ERoomType)
  @IsNotEmpty()
  roomType: ERoomType;

  @IsEnum(ERoomStatus)
  @IsOptional()
  status?: ERoomStatus;
}

export class UpdateRoomDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsNumber()
  @IsOptional()
  totalSeats?: number;

  @IsEnum(ERoomType)
  @IsOptional()
  roomType?: ERoomType;

  @IsEnum(ERoomStatus)
  @IsOptional()
  status?: ERoomStatus;
}
