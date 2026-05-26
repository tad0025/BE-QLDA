import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, JoinColumn, Unique, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { EMovieFormat } from '../../movie/enums/movie.enum';
import { Movie } from '../../movie/entities/movie.entity';
import { Room } from '../../cinema/entities/room.entity';
import { Booking } from '../../booking/entities/booking.entity';
import { SeatHold } from '../../booking/entities/seat-hold.entity';
import { EShowtimeStatus } from '../enums/EShowTimeStatus.enum';
import { Ticket } from 'src/module/ticket/entities/ticket.entity';

@Entity('showtimes')
@Unique(['roomId', 'publicStartTime'])
export class Showtime {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  movieId: number;

  @Column()
  roomId: number;

  @Column({ type: 'timestamp' })
  publicStartTime: Date;

  @Column({ type: 'timestamp' })
  movieStartTime: Date;

  @Column({ type: 'timestamp' })
  movieEndTime: Date;

  @Column({ type: 'timestamp' })
  roomReleaseTime: Date;

  @Column({ type: 'integer' })
  preShowMinutes: number;

  @Column({ type: 'integer', default: 15 })
  postMovieBufferMinutes: number;

  @Column({ type: 'enum', enum: EMovieFormat })
  format: EMovieFormat;

  @Column({ type: 'enum', enum: EShowtimeStatus })
  status: EShowtimeStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

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


  @OneToMany(() => Ticket, (ticket) => ticket.showtime)
  tickets: Ticket[];
}

