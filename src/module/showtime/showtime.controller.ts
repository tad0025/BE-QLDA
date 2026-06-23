import {
  Controller, Get, Post, Put, Delete, Body, Param,
  ParseIntPipe, Query, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ShowtimeService } from './showtime.service';
import { CreateShowtimeDto, UpdateShowtimeDto, BulkCreateShowtimeDto } from './dto/showtime.dto';
import { JwtAuthGuard } from '../../core/security/jwt/jwt-auth.guard';
import { RolesGuard } from '../../core/security/roles/roles.guard';
import { Roles } from '../../core/security/roles/roles.decorator';
import { EUserRole } from '../users/enums/user.enum';

@Controller('showtimes')
export class ShowtimeController {
  constructor(private readonly showtimeService: ShowtimeService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(EUserRole.ADMIN, EUserRole.STAFF)
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateShowtimeDto) {
    return this.showtimeService.create(dto);
  }

  @Post('bulk')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(EUserRole.ADMIN, EUserRole.STAFF)
  @HttpCode(HttpStatus.CREATED)
  async bulkCreate(@Body() dto: BulkCreateShowtimeDto) {
    return this.showtimeService.bulkCreate(dto);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll(
    @Query('page') page: number = 1,
    @Query('pageSize') pageSize: number = 10,
  ) {
    return this.showtimeService.findAll(page, pageSize);
  }

  @Get('by-movie/:movieId')
  @HttpCode(HttpStatus.OK)
  async getByMovieId(@Param('movieId', ParseIntPipe) movieId: number) {
    return this.showtimeService.getByMovieId(movieId);
  }

  @Get('by-cinema/:cinemaId')
  @HttpCode(HttpStatus.OK)
  async getByCinemaId(@Param('cinemaId', ParseIntPipe) cinemaId: number) {
    return this.showtimeService.getByCinemaId(cinemaId);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.showtimeService.findOne(id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(EUserRole.ADMIN, EUserRole.STAFF)
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateShowtimeDto,
  ) {
    return this.showtimeService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(EUserRole.ADMIN, EUserRole.STAFF)
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.showtimeService.remove(id);
  }
}
