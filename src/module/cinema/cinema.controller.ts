import {
  Controller, Get, Post, Put, Delete, Body, Param,
  ParseIntPipe, Query, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { CinemaService } from './cinema.service';
import { CreateCinemaDto, UpdateCinemaDto, GetCinemasQueryDto } from './dto/cinema.dto';
import { CreateRoomDto, UpdateRoomDto } from './dto/room.dto';
import { GenerateSeatsDto } from './dto/seat.dto';
import { JwtAuthGuard } from '../../core/security/jwt/jwt-auth.guard';
import { RolesGuard } from '../../core/security/roles/roles.guard';
import { Roles } from '../../core/security/roles/roles.decorator';
import { EUserRole } from '../users/enums/user.enum';

@Controller('cinemas')
export class CinemaController {
  constructor(private readonly cinemaService: CinemaService) {}

  // ─── CINEMA ───────────────────────────────────────────────────────────

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(EUserRole.ADMIN, EUserRole.STAFF)
  @HttpCode(HttpStatus.CREATED)
  async createCinema(@Body() dto: CreateCinemaDto) {
    return this.cinemaService.createCinema(dto);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  async getAllCinemas(@Query() query: GetCinemasQueryDto) {
    return this.cinemaService.getAllCinemas(query);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async getCinemaById(@Param('id', ParseIntPipe) id: number) {
    return this.cinemaService.getCinemaById(id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(EUserRole.ADMIN, EUserRole.STAFF)
  @HttpCode(HttpStatus.OK)
  async updateCinema(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateCinemaDto) {
    return this.cinemaService.updateCinema(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(EUserRole.ADMIN, EUserRole.STAFF)
  @HttpCode(HttpStatus.OK)
  async deleteCinema(@Param('id', ParseIntPipe) id: number) {
    return this.cinemaService.deleteCinema(id);
  }

  // ─── ROOM ─────────────────────────────────────────────────────────────

  @Post(':cinemaId/rooms')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(EUserRole.ADMIN, EUserRole.STAFF)
  @HttpCode(HttpStatus.CREATED)
  async createRoom(
    @Param('cinemaId', ParseIntPipe) cinemaId: number,
    @Body() dto: CreateRoomDto,
  ) {
    return this.cinemaService.createRoom(cinemaId, dto);
  }

  @Get(':cinemaId/rooms')
  @HttpCode(HttpStatus.OK)
  async getRoomsByCinemaId(@Param('cinemaId', ParseIntPipe) cinemaId: number) {
    return this.cinemaService.getRoomsByCinemaId(cinemaId);
  }

  @Get('rooms/:roomId')
  @HttpCode(HttpStatus.OK)
  async getRoomById(@Param('roomId', ParseIntPipe) roomId: number) {
    return this.cinemaService.getRoomById(roomId);
  }

  @Put('rooms/:roomId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(EUserRole.ADMIN, EUserRole.STAFF)
  @HttpCode(HttpStatus.OK)
  async updateRoom(
    @Param('roomId', ParseIntPipe) roomId: number,
    @Body() dto: UpdateRoomDto,
  ) {
    return this.cinemaService.updateRoom(roomId, dto);
  }

  @Delete('rooms/:roomId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(EUserRole.ADMIN, EUserRole.STAFF)
  @HttpCode(HttpStatus.OK)
  async deleteRoom(@Param('roomId', ParseIntPipe) roomId: number) {
    return this.cinemaService.deleteRoom(roomId);
  }

  // ─── SEAT ─────────────────────────────────────────────────────────────

  @Post('rooms/:roomId/generate-seats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(EUserRole.ADMIN, EUserRole.STAFF)
  @HttpCode(HttpStatus.CREATED)
  async generateSeats(
    @Param('roomId', ParseIntPipe) roomId: number,
    @Body() dto: GenerateSeatsDto,
  ) {
    return this.cinemaService.generateSeats(roomId, dto);
  }

  @Get('rooms/:roomId/seats')
  @HttpCode(HttpStatus.OK)
  async getSeatsByRoomId(@Param('roomId', ParseIntPipe) roomId: number) {
    return this.cinemaService.getSeatsByRoomId(roomId);
  }
}
