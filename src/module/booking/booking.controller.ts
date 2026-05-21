import {
  Controller, Get, Post, Body, Param, ParseIntPipe,
  Query, UseGuards, HttpCode, HttpStatus, Request,
} from '@nestjs/common';
import { BookingService } from './booking.service';
import { HoldSeatsDto, CreateBookingDto } from './dto/booking.dto';
import { JwtAuthGuard } from '../../core/security/jwt/jwt-auth.guard';

@Controller('bookings')
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  @Post('hold-seats')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async holdSeats(@Request() req, @Body() dto: HoldSeatsDto) {
    return this.bookingService.holdSeats(req.user.id, dto);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async createBooking(@Request() req, @Body() dto: CreateBookingDto) {
    return this.bookingService.createBooking(req.user.id, dto);
  }

  @Get('showtime/:showtimeId/seats')
  @HttpCode(HttpStatus.OK)
  async getBookedSeatsForShowtime(@Param('showtimeId', ParseIntPipe) showtimeId: number) {
    return this.bookingService.getBookedSeatsForShowtime(showtimeId);
  }

  @Get('my-bookings')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async getUserBookingHistory(
    @Request() req,
    @Query('page') page: number = 1,
    @Query('pageSize') pageSize: number = 10,
  ) {
    return this.bookingService.getUserBookingHistory(req.user.id, page, pageSize);
  }
}
