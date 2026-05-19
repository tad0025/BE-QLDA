import { Injectable, NotFoundException } from "@nestjs/common";
import { CreateMovieRequestDto, UpdateMovieRequestDto } from "./dto/movie.dto";
import { InjectRepository } from "@nestjs/typeorm";
import { Movie } from "./entities/movie.entity";
import { FindOptionsOrder, FindOptionsWhere, In, Repository } from "typeorm";
import { EMovieStatus } from "./enums/movie.enum";
import { ApiResponse } from "../../core/dto/ApiResponse.dto";

@Injectable()
export class MovieService {
    constructor(
        @InjectRepository(Movie)
        private readonly movieRepository: Repository<Movie>
    ) { }

    async createMovie(request: CreateMovieRequestDto) {
        const newMovie = this.movieRepository.create({
            title: request.name,
            description: request.description,
            status: request.status as EMovieStatus,
            posterUrl: request.imageUrl,
            trailerUrl: request.trailerUrl,
            durationMinutes: request.duration,
            releaseDate: request.releaseDate,
            genre: request.genre,
            director: request.director,
            cast: request.actors ? request.actors.join(', ') : '',
            language: request.language,
            ageLimit: request.ageLimit,
        });

        const savedMovie = await this.movieRepository.save(newMovie);
        return new ApiResponse(true, 'Tạo phim mới thành công', savedMovie);
    }

    async updateMovie(id: number, request: UpdateMovieRequestDto) {
        const movie = await this.movieRepository.findOne({ where: { id } });
        if (!movie) {
            throw new NotFoundException('Không tìm thấy phim');
        }

        const updatedMovie = Object.assign(movie, {
            title: request.name ?? movie.title,
            description: request.description ?? movie.description,
            status: request.status ? (request.status as EMovieStatus) : movie.status,
            posterUrl: request.imageUrl ?? movie.posterUrl,
            trailerUrl: request.trailerUrl ?? movie.trailerUrl,
            durationMinutes: request.duration ?? movie.durationMinutes,
            releaseDate: request.releaseDate ?? movie.releaseDate,
            genre: request.genre ?? movie.genre,
            director: request.director ?? movie.director,
            cast: request.actors ? request.actors.join(', ') : movie.cast,
            language: request.language ?? movie.language,
            ageLimit: request.ageLimit ?? movie.ageLimit,
        });

        await this.movieRepository.save(updatedMovie);

        return new ApiResponse(true, 'Cập nhật phim thành công', updatedMovie);
    }

    async deleteMovie(id: number) {
        const movie = await this.movieRepository.findOne({ where: { id } });
        if (!movie) {
            throw new NotFoundException('Không tìm thấy phim');
        }

        await this.movieRepository.remove(movie);
        return new ApiResponse(true, 'Xóa phim thành công');
    }

    async getMovie(id: number) {
        const movie = await this.movieRepository.findOne({ where: { id } });
        if (!movie) {
            throw new NotFoundException('Không tìm thấy phim');
        }

        return new ApiResponse(true, 'Lấy thông tin phim thành công', movie);
    }

    async getAllMovies(page: number, pageSize: number, sortBy: string, genres: string[]) {
        const skip = (page - 1) * pageSize;

        let where: FindOptionsWhere<Movie> = {};

        if (genres && genres.length > 0) {
            where.genre = In(genres);
        }

        let order: FindOptionsOrder<Movie> = {};
        if (sortBy) {
            order[sortBy] = 'DESC';
        }

        const [movies, totalItems] = await this.movieRepository.findAndCount({
            where,
            skip,
            take: pageSize,
            order,
        });

        const totalPages = Math.ceil(totalItems / pageSize);

        const formattedMovies = movies.map((movie) => ({
            id: movie.id,
            name: movie.title,
            imageUrl: movie.posterUrl,
            releaseDate: movie.releaseDate,
            genre: movie.genre,
            director: movie.director,
            cast: movie.cast,
            language: movie.language,
            ageLimit: movie.ageLimit,
        }));

        const response = new ApiResponse(true, 'Lấy danh sách phim thành công', formattedMovies);
        response.pagination = {
            page: Number(page),
            pageSize: Number(pageSize),
            totalItems,
            totalPages,
        };

        return response;
    }
}