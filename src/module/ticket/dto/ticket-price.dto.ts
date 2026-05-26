import { IsNumber, IsNotEmpty, IsEnum, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { EDayType } from '../enums/ticket.enum';
import { ERoomType } from '../../cinema/enums/cinema.enum';

export class CreateTicketPriceDto {
  @IsEnum(EDayType)
  @IsNotEmpty()
  dayType: EDayType;

  @IsEnum(ERoomType)
  @IsNotEmpty()
  roomType: ERoomType;

  @Type(() => Number)
  @IsNumber()
  @IsNotEmpty()
  price: number;
}

export class UpdateTicketPriceDto {
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  price?: number;

  @IsEnum(ERoomType)
  @IsOptional()
  roomType?: ERoomType;

  @IsEnum(EDayType)
  @IsOptional()
  dayType?: EDayType;
}

export class BulkCreateTicketPriceDto {

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TicketPriceItem)
  prices: TicketPriceItem[];
}

export class TicketPriceItem {
  @IsEnum(ERoomType)
  @IsNotEmpty()
  roomType: ERoomType;

  @IsEnum(EDayType)
  @IsNotEmpty()
  dayType: EDayType;

  @Type(() => Number)
  @IsNumber()
  @IsNotEmpty()
  price: number;
}
