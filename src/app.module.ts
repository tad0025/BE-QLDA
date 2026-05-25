import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { CustomThrottlerGuard } from './core/security/throttler/custom-throttler.guard';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';

// Infrastructure Modules
import { RedisModule } from './module/redis/redis.module';

// Feature Modules
import { AuthModule } from './module/auth/auth.module';
import { HomeModule } from './module/home/home.module';
import { MovieModule } from './module/movie/movie.module';
import { BookingModule } from './module/booking/booking.module';
import { CinemaModule } from './module/cinema/cinema.module';
import { ConcessionModule } from './module/concession/concession.module';
import { NotificationModule } from './module/notification/notification.module';
import { PaymentModule } from './module/payment/payment.module';
import { PromotionModule } from './module/promotion/promotion.module';
import { ShowtimeModule } from './module/showtime/showtime.module';
import { TicketModule } from './module/ticket/ticket.module';
import { UsersModule } from './module/users/users.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([
      {
        ttl: 2000,
        limit: 5,
      },
    ]),

    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'mysql',
        host: config.get<string>('DB_HOST'),
        port: config.get<number>('DB_PORT'),
        username: config.get<string>('DB_USER'),
        password: config.get<string>('DB_PASS'),
        database: config.get<string>('DB_NAME'),
        autoLoadEntities: true,
        synchronize: true,
      }),
    }),

    RedisModule,

    AuthModule,
    HomeModule,
    MovieModule,
    BookingModule,
    CinemaModule,
    ConcessionModule,
    NotificationModule,
    PaymentModule,
    PromotionModule,
    ShowtimeModule,
    TicketModule,
    UsersModule,
  ],
  controllers: [],
  providers: [
    {
      provide: APP_GUARD,
      useClass: CustomThrottlerGuard,
    },
  ],
})
export class AppModule { }
