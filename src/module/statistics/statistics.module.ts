import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StatisticsController } from './statistics.controller';
import { StatisticsService } from './statistics.service';
import { Booking } from '../booking/entities/booking.entity';
import { Ticket } from '../ticket/entities/ticket.entity';
import { Showtime } from '../showtime/entities/showtime.entity';
import { Movie } from '../movie/entities/movie.entity';
import { Room } from '../cinema/entities/room.entity';
import { Cinema } from '../cinema/entities/cinema.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Booking, Ticket, Showtime, Movie, Room, Cinema]),
  ],
  controllers: [StatisticsController],
  providers: [StatisticsService],
  exports: [StatisticsService],
})
export class StatisticsModule {}
