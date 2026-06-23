import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HomeController } from './home.controller';
import { HomeService } from './home.service';
import { Movie } from '../movie/entities/movie.entity';
import { Cinema } from '../cinema/entities/cinema.entity';
import { Showtime } from '../showtime/entities/showtime.entity';
import { Promotion } from '../promotion/entities/promotion.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Movie, Cinema, Showtime, Promotion]),
  ],
  controllers: [HomeController],
  providers: [HomeService],
})
export class HomeModule {}
