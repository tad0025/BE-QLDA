import { IsString, IsOptional, IsEnum, IsNotEmpty } from 'class-validator';
import { ERoomType, ERoomStatus } from '../enums/cinema.enum';

export class CreateRoomDto {
  @IsString()
  @IsNotEmpty()
  name: string;

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

  @IsEnum(ERoomType)
  @IsOptional()
  roomType?: ERoomType;

  @IsEnum(ERoomStatus)
  @IsOptional()
  status?: ERoomStatus;
}
