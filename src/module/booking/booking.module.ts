import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Booking } from './entities/booking.entity';
import { BookingConcession } from './entities/booking-concession.entity';
import { SeatHold } from './entities/seat-hold.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Booking, BookingConcession, SeatHold])],
})
export class BookingModule {}
