import { Entity, PrimaryGeneratedColumn, Column, OneToMany, Unique } from 'typeorm';
import { ERoomType } from '../../cinema/enums/cinema.enum';
import { EDayType } from '../enums/ticket.enum';
import { Ticket } from './ticket.entity';

@Entity('ticket_prices')
@Unique(['roomType', 'dayType'])
export class TicketPrice {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'enum', enum: ERoomType })
  roomType: ERoomType;

  @Column({ type: 'enum', enum: EDayType })
  dayType: EDayType;

  @Column()
  price: number;


  @OneToMany(() => Ticket, (ticket) => ticket.ticketPrice)
  tickets: Ticket[];
}
