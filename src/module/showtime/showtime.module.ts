import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Showtime } from './entities/showtime.entity';
import { ShowtimeService } from './showtime.service';
import { ShowtimeController } from './showtime.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Showtime]),
    AuthModule,
  ],
  controllers: [ShowtimeController],
  providers: [ShowtimeService],
  exports: [ShowtimeService],
})
export class ShowtimeModule {}
