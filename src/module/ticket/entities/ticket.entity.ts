import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { Booking } from '../../booking/entities/booking.entity';
import { Seat } from '../../cinema/entities/seat.entity';
import { TicketPrice } from './ticket-price.entity';

@Entity('tickets')
export class Ticket {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  bookingId: number;

  @Column()
  seatId: number;

  @Column()
  ticketPriceId: number;

  @Column({ nullable: true })
  qrCode: string;

  @Column()
  price: number;

  @Column({ default: false })
  isCheckedIn: boolean;

  @Column({ type: 'timestamp', nullable: true })
  checkedInAt: Date;

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
}

