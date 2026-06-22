import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  OneToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { EBookingStatus, EBookingSource } from '../enums/booking.enum';
import { User } from '../../users/entities/user.entity';
import { Showtime } from '../../showtime/entities/showtime.entity';
import { Promotion } from '../../promotion/entities/promotion.entity';
import { Ticket } from '../../ticket/entities/ticket.entity';
import { BookingConcession } from './booking-concession.entity';
import { Payment } from '../../payment/entities/payment.entity';
import { SeatHold } from './seat-hold.entity';

@Entity('bookings')
export class Booking {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  userId: number;

  @Column({ nullable: true })
  staffId: number;

  @Column()
  showtimeId: number;

  @Column({ nullable: true })
  promotionId: number;

  @Column({ unique: true })
  bookingCode: string;

  @Column()
  totalAmount: number;

  @Column({ default: 0 })
  discountAmount: number;

  @Column({ default: 0 })
  pointsUsed: number;

  @Column({ type: 'enum', enum: EBookingStatus, default: EBookingStatus.PENDING })
  status: EBookingStatus;

  @Column({ type: 'enum', enum: EBookingSource })
  source: EBookingSource;

  @Column({ type: 'timestamp', nullable: true })
  expiredAt: Date;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @ManyToOne(() => User, (user) => user.bookings, { nullable: true })
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => User, (user) => user.staffBookings, { nullable: true })
  @JoinColumn({ name: 'staffId' })
  staff: User;

  @ManyToOne(() => Showtime, (showtime) => showtime.bookings)
  @JoinColumn({ name: 'showtimeId' })
  showtime: Showtime;

  @ManyToOne(() => Promotion, (promotion) => promotion.bookings, { nullable: true })
  @JoinColumn({ name: 'promotionId' })
  promotion: Promotion;

  @OneToMany(() => Ticket, (ticket) => ticket.booking)
  tickets: Ticket[];

  @OneToMany(() => BookingConcession, (bookingConcession) => bookingConcession.booking)
  bookingConcessions: BookingConcession[];

  @OneToMany(() => SeatHold, (seatHold) => seatHold.booking)
  seatHolds: SeatHold[];

  @OneToOne(() => Payment, (payment) => payment.booking)
  payment: Payment;
}

