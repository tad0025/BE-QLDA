import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Booking } from './entities/booking.entity';
import { BookingConcession } from './entities/booking-concession.entity';
import { SeatHold } from './entities/seat-hold.entity';
import { Seat } from '../cinema/entities/seat.entity';
import { TicketPrice } from '../ticket/entities/ticket-price.entity';
import { ConcessionProduct } from '../concession/entities/concession-product.entity';
import { Promotion } from '../promotion/entities/promotion.entity';
import { BookingService } from './booking.service';
import { BookingController } from './booking.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Booking,
      BookingConcession,
      SeatHold,
      Seat,
      TicketPrice,
      ConcessionProduct,
      Promotion,
    ]),
    AuthModule,
  ],
  controllers: [BookingController],
  providers: [BookingService],
  exports: [BookingService],
})
export class BookingModule {}
