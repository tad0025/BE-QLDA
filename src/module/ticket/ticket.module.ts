import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TicketPrice } from './entities/ticket-price.entity';
import { Ticket } from './entities/ticket.entity';
import { Seat } from '../cinema/entities/seat.entity';
import { SeatHold } from '../booking/entities/seat-hold.entity';
import { TicketService } from './ticket.service';
import { TicketController } from './ticket.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([TicketPrice, Ticket, Seat, SeatHold]),
    AuthModule,
  ],
  controllers: [TicketController],
  providers: [TicketService],
  exports: [TicketService],
})
export class TicketModule {}
