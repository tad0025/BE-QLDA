import { IsNumber, IsNotEmpty, IsEnum, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ESeatType } from '../../cinema/enums/cinema.enum';
import { EDayType } from '../enums/ticket.enum';

export class CreateTicketPriceDto {
  @Type(() => Number)
  @IsNumber()
  @IsNotEmpty()
  showtimeId: number;

  @IsEnum(ESeatType)
  @IsNotEmpty()
  seatType: ESeatType;

  @IsEnum(EDayType)
  @IsNotEmpty()
  dayType: EDayType;

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

  @IsEnum(ESeatType)
  @IsOptional()
  seatType?: ESeatType;

  @IsEnum(EDayType)
  @IsOptional()
  dayType?: EDayType;
}

export class BulkCreateTicketPriceDto {
  @Type(() => Number)
  @IsNumber()
  @IsNotEmpty()
  showtimeId: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TicketPriceItem)
  prices: TicketPriceItem[];
}

export class TicketPriceItem {
  @IsEnum(ESeatType)
  @IsNotEmpty()
  seatType: ESeatType;

  @IsEnum(EDayType)
  @IsNotEmpty()
  dayType: EDayType;

  @Type(() => Number)
  @IsNumber()
  @IsNotEmpty()
  price: number;
}
