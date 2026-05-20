import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, Unique } from 'typeorm';
import { Booking } from '../../booking/entities/booking.entity';
import { Seat } from '../../cinema/entities/seat.entity';
import { TicketPrice } from './ticket-price.entity';
import { Showtime } from 'src/module/showtime/entities/showtime.entity';
import { ETicketStatus } from '../enums/ticket.enum';

@Entity('tickets')
@Unique(['showtimeId', 'seatId'])
export class Ticket {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  bookingId: number;

  @Column()
  seatId: number;

  @Column()
  ticketPriceId: number;

  @Column()
  showtimeId: number;

  @Column({ nullable: true })
  qrCode: string;

  @Column()
  price: number;

  @Column({ default: false })
  isCheckedIn: boolean;

  @Column({ type: 'timestamp', nullable: true })
  checkedInAt: Date;

  @Column({ type: 'enum', enum: ETicketStatus, default: ETicketStatus.ACTIVE })
  status: ETicketStatus;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @ManyToOne(() => Booking, (booking) => booking.tickets)
  @JoinColumn({ name: 'bookingId' })
  booking: Booking;

  @ManyToOne(() => Seat, (seat) => seat.tickets)
  @JoinColumn({ name: 'seatId' })
  seat: Seat;

  @ManyToOne(() => TicketPrice, (ticketPrice) => ticketPrice.tickets)
  @JoinColumn({ name: 'ticketPriceId' })
  ticketPrice: TicketPrice;

  @ManyToOne(() => Showtime, (showtime) => showtime.tickets)
  @JoinColumn({ name: 'showtimeId' })
  showtime: Showtime;
}
