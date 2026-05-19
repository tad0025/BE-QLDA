import { IsString, IsOptional, IsNumber, IsArray, IsDateString, IsNotEmpty, IsDate } from 'class-validator';
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

    @IsNumber()
    @IsOptional()
    duration: number;

    @IsNumber()
    @IsOptional()
    rating: number;

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

    @IsNumber()
    @IsOptional()
    budget: number;

    @IsString()
    @IsOptional()
    language: string;

    @IsNumber()
    @IsOptional()
    ageLimit: number;

    @IsNumber()
    @IsOptional()
    revenue: number;
}

export class UpdateMovieRequestDto extends CreateMovieRequestDto {}