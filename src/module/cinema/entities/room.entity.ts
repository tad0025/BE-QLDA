import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { ERoomType } from '../enums/cinema.enum';
import { Cinema } from './cinema.entity';
import { Seat } from './seat.entity';
import { Showtime } from '../../showtime/entities/showtime.entity';

@Entity('rooms')
export class Room {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  cinemaId: number;

  @Column()
  name: string;

  @Column()
  totalSeats: number;

  @Column({ type: 'enum', enum: ERoomType })
  roomType: ERoomType;

  @ManyToOne(() => Cinema, (cinema) => cinema.rooms)
  @JoinColumn({ name: 'cinemaId' })
  cinema: Cinema;

  @OneToMany(() => Seat, (seat) => seat.room)
  seats: Seat[];

  @OneToMany(() => Showtime, (showtime) => showtime.room)
  showtimes: Showtime[];
}

