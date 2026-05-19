import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { EMovieFormat } from '../../movie/enums/movie.enum';
import { Movie } from '../../movie/entities/movie.entity';
import { Room } from '../../cinema/entities/room.entity';
import { Booking } from '../../booking/entities/booking.entity';
import { SeatHold } from '../../booking/entities/seat-hold.entity';
import { TicketPrice } from '../../ticket/entities/ticket-price.entity';

@Entity('showtimes')
export class Showtime {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  movieId: number;

  @Column()
  roomId: number;

  @Column({ type: 'timestamp' })
  startTime: Date;

  @Column({ type: 'timestamp' })
  endTime: Date;

  @Column({ type: 'enum', enum: EMovieFormat })
  format: EMovieFormat;

  @ManyToOne(() => Movie, (movie) => movie.showtimes)
  @JoinColumn({ name: 'movieId' })
  movie: Movie;

  @ManyToOne(() => Room, (room) => room.showtimes)
  @JoinColumn({ name: 'roomId' })
  room: Room;

  @OneToMany(() => Booking, (booking) => booking.showtime)
  bookings: Booking[];

  @OneToMany(() => SeatHold, (seatHold) => seatHold.showtime)
  seatHolds: SeatHold[];

  @OneToMany(() => TicketPrice, (ticketPrice) => ticketPrice.showtime)
  ticketPrices: TicketPrice[];
}

