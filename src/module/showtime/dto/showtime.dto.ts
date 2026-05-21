import { IsNumber, IsNotEmpty, IsOptional, IsEnum, IsDateString } from 'class-validator';
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

  @IsDateString()
  @IsNotEmpty()
  movieStartTime: string;

  @IsDateString()
  @IsNotEmpty()
  movieEndTime: string;

  @IsDateString()
  @IsNotEmpty()
  roomReleaseTime: string;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  preShowMinutes?: number;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  exitBufferMinutes?: number;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  cleaningMinutes?: number;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  entryBufferMinutes?: number;

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

  @IsDateString()
  @IsOptional()
  movieStartTime?: string;

  @IsDateString()
  @IsOptional()
  movieEndTime?: string;

  @IsDateString()
  @IsOptional()
  roomReleaseTime?: string;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  preShowMinutes?: number;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  exitBufferMinutes?: number;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  cleaningMinutes?: number;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  entryBufferMinutes?: number;

  @IsEnum(EMovieFormat)
  @IsOptional()
  format?: EMovieFormat;

  @IsEnum(EShowtimeStatus)
  @IsOptional()
  status?: EShowtimeStatus;
}
