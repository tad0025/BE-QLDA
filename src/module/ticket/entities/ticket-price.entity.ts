import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import {ERoomType} from '../../cinema/enums/cinema.enum';
import { EDayType } from '../enums/ticket.enum';
import { Showtime } from '../../showtime/entities/showtime.entity';
import { Ticket } from './ticket.entity';

@Entity('ticket_prices')
export class TicketPrice {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  showtimeId: number;

  @Column({ type: 'enum', enum: ERoomType })
  roomType: ERoomType;

  @Column({ type: 'enum', enum: EDayType })
  dayType: EDayType;

  @Column()
  price: number;

  @ManyToOne(() => Showtime, (showtime) => showtime.ticketPrices)
  @JoinColumn({ name: 'showtimeId' })
  showtime: Showtime;

  @OneToMany(() => Ticket, (ticket) => ticket.ticketPrice)
  tickets: Ticket[];
}
