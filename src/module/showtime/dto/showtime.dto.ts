import { IsNumber, IsNotEmpty, IsOptional, IsEnum, IsDateString, IsArray, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { EMovieFormat } from '../../movie/enums/movie.enum';
import { EShowtimeStatus } from '../enums/EShowTimeStatus.enum';

export class CreateShowtimeDto {
  @Type(() => Number)
  @IsNumber()
  @IsNotEmpty()
  movieId: number;

  @Type(() => Number)
  @IsNumber()
  @IsNotEmpty()
  roomId: number;

  @IsDateString()
  @IsNotEmpty()
  publicStartTime: string;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  preShowMinutes?: number;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  postMovieBufferMinutes?: number;

  @IsEnum(EMovieFormat)
  @IsNotEmpty()
  format: EMovieFormat;

  @IsEnum(EShowtimeStatus)
  @IsOptional()
  status?: EShowtimeStatus;
}

export class UpdateShowtimeDto {
  @IsDateString()
  @IsOptional()
  publicStartTime?: string;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  preShowMinutes?: number;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  postMovieBufferMinutes?: number;

  @IsEnum(EMovieFormat)
  @IsOptional()
  format?: EMovieFormat;

  @IsEnum(EShowtimeStatus)
  @IsOptional()
  status?: EShowtimeStatus;
}

export class BulkCreateShowtimeDto {
  @Type(() => Number)
  @IsNumber()
  @IsNotEmpty()
  movieId: number;

  @Type(() => Number)
  @IsNumber()
  @IsNotEmpty()
  cinemaId: number;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  primaryRoomId?: number;

  @IsDateString()
  @IsNotEmpty()
  startDate: string;

  @IsDateString()
  @IsNotEmpty()
  endDate: string;

  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  timeSlots: string[]; // VD: ["08:00", "15:00", "20:00"]

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  preShowMinutes?: number;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  postMovieBufferMinutes?: number;

  @IsEnum(EMovieFormat)
  @IsNotEmpty()
  format: EMovieFormat;

  @IsEnum(EShowtimeStatus)
  @IsOptional()
  status?: EShowtimeStatus;
}
