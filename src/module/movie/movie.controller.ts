import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Post, Put, Query, UseGuards } from "@nestjs/common";
import { MovieService } from "./movie.service";
import { CreateMovieRequestDto, UpdateMovieRequestDto } from "./dto/movie.dto";
import { JwtAuthGuard } from "src/core/security/jwt/jwt-auth.guard";
import { RolesGuard } from "src/core/security/roles/roles.guard";
import { Roles } from "src/core/security/roles/roles.decorator";
import { EUserRole } from "../users/enums/user.enum";

@Controller('movies')
export class MovieController {
    constructor(
        private readonly movieService: MovieService,
    ) { }

    @Post('create-movie')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(EUserRole.ADMIN, EUserRole.STAFF)
    @HttpCode(HttpStatus.CREATED)
    async createMovie(@Body() request: CreateMovieRequestDto) {
        return this.movieService.createMovie(request);
    }

    @Put('update-movie/:id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(EUserRole.ADMIN, EUserRole.STAFF)
    @HttpCode(HttpStatus.OK)
    async updateMovie(@Param('id', ParseIntPipe) id: number, @Body() request: UpdateMovieRequestDto) {
        return this.movieService.updateMovie(id, request);
    }

    @Delete('delete-movie/:id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(EUserRole.ADMIN, EUserRole.STAFF)
    @HttpCode(HttpStatus.OK)
    async deleteMovie(@Param('id', ParseIntPipe) id: number) {
        return this.movieService.deleteMovie(id);
    }

    @Get('get-movie/:id')
    @HttpCode(HttpStatus.OK)
    async getMovie(@Param('id', ParseIntPipe) id: number) {
        return this.movieService.getMovie(id);
    }

    @Get('get-all-movies')
    @HttpCode(HttpStatus.OK)
    async getAllMovies(
        @Query('page') page: number = 1,
        @Query('pageSize') pageSize: number = 10,
        @Query('sortBy') sortBy: string = 'id',
        @Query('genres') genres: string[] = []
    ) {
        return this.movieService.getAllMovies(page, pageSize, sortBy, genres);
    }
}