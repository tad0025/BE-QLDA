import {
  IsString,
  IsOptional,
  IsNumber,
  IsArray,
  IsNotEmpty,
  IsDate,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateMovieRequestDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description: string;

  @IsString()
  @IsOptional()
  status: string;

  @IsString()
  @IsOptional()
  format: string;

  @IsString()
  @IsOptional()
  imageUrl: string;

  @IsString()
  @IsOptional()
  trailerUrl: string;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  duration: number;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  rating: number;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  price: number;

  @Type(() => Date)
  @IsDate()
  @IsOptional()
  releaseDate: Date;

  @Type(() => Date)
  @IsDate()
  @IsOptional()
  endDate: Date;

  @Type(() => Date)
  @IsDate()
  @IsOptional()
  screeningEndDate: Date;

  @IsString()
  @IsOptional()
  genre: string;

  @IsString()
  @IsOptional()
  director: string;

  @IsArray()
  @IsOptional()
  actors: string[];

  @IsString()
  @IsOptional()
  producer: string;

  @IsString()
  @IsOptional()
  studio: string;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  budget: number;

  @IsString()
  @IsOptional()
  language: string;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  ageLimit: number;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  revenue: number;
}

export class UpdateMovieRequestDto extends CreateMovieRequestDto {}
