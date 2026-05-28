import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Showtime } from './entities/showtime.entity';
import { ShowtimeService } from './showtime.service';
import { ShowtimeController } from './showtime.controller';
import { ShowtimeSchedulerService } from './showtime.scheduler';
import { AuthModule } from '../auth/auth.module';
import { Movie } from '../movie/entities/movie.entity';
import { Room } from '../cinema/entities/room.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Showtime, Movie, Room]), AuthModule],
  controllers: [ShowtimeController],
  providers: [ShowtimeService, ShowtimeSchedulerService],
  exports: [ShowtimeService],
})
export class ShowtimeModule {}
