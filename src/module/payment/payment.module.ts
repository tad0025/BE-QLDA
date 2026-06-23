import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';

import { Payment } from './entities/payment.entity';
import { Booking } from '../booking/entities/booking.entity';
import { SeatHold } from '../booking/entities/seat-hold.entity';
import { BookingConcession } from '../booking/entities/booking-concession.entity';
import { ConcessionProduct } from '../concession/entities/concession-product.entity';
import { User } from '../users/entities/user.entity';

import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';

import { MomoService } from './services/momo.service';
import { VnpayService } from './services/vnpay.service';
import { PaypalService } from './services/paypal.service';

import { AuthModule } from '../auth/auth.module';
import { TicketModule } from '../ticket/ticket.module';
import { RedisModule } from '../redis/redis.module';
import { BookingModule } from '../booking/booking.module';
import { MailModule } from '../mails/mail.module';

@Module({
  imports: [
    ScheduleModule,
    TypeOrmModule.forFeature([Payment, Booking, SeatHold, BookingConcession, ConcessionProduct, User]),
    AuthModule,
    TicketModule,
    RedisModule,
    forwardRef(() => BookingModule),
    MailModule,
  ],
  controllers: [PaymentController],
  providers: [PaymentService, MomoService, VnpayService, PaypalService],
  exports: [PaymentService],
})
export class PaymentModule {}
