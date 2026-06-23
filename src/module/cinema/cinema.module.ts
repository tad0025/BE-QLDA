import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Cinema } from './entities/cinema.entity';
import { Room } from './entities/room.entity';
import { Seat } from './entities/seat.entity';
import { RoomTypeConfig } from './entities/room-type-config.entity';
import { CinemaService } from './cinema.service';
import { CinemaController } from './cinema.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Cinema, Room, Seat, RoomTypeConfig]),
    AuthModule,
  ],
  controllers: [CinemaController],
  providers: [CinemaService],
  exports: [CinemaService],
})
export class CinemaModule {}
