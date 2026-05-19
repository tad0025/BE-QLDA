import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { ESeatHoldStatus } from '../enums/booking.enum';
import { Booking } from './booking.entity';
import { Showtime } from '../../showtime/entities/showtime.entity';
import { Seat } from '../../cinema/entities/seat.entity';
import { User } from '../../users/entities/user.entity';

@Entity('seat_holds')
export class SeatHold {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  bookingId: number;

  @Column()
  showtimeId: number;

  @Column()
  seatId: number;

  @Column()
  userId: number;

  @Column({ type: 'timestamp' })
  heldAt: Date;

  @Column({ type: 'timestamp' })
  expiredAt: Date;

  @Column({ type: 'enum', enum: ESeatHoldStatus, default: ESeatHoldStatus.HOLDING })
  status: ESeatHoldStatus;

  @ManyToOne(() => Booking, (booking) => booking.seatHolds, { nullable: true })
  @JoinColumn({ name: 'bookingId' })
  booking: Booking;

  @ManyToOne(() => Showtime, (showtime) => showtime.seatHolds)
  @JoinColumn({ name: 'showtimeId' })
  showtime: Showtime;

  @ManyToOne(() => Seat, (seat) => seat.seatHolds)
  @JoinColumn({ name: 'seatId' })
  seat: Seat;

  @ManyToOne(() => User, (user) => user.seatHolds)
  @JoinColumn({ name: 'userId' })
  user: User;
}
