import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, JoinColumn, Unique } from 'typeorm';
import { Room } from './room.entity';
import { SeatHold } from '../../booking/entities/seat-hold.entity';
import { Ticket } from '../../ticket/entities/ticket.entity';
import {ESeatStatus} from "../enums/cinema.enum";

@Entity('seats')
@Unique(['roomId', 'row', 'number'])
export class Seat {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  roomId: number;

  @Column()
  row: string;

  @Column()
  number: number;

  @Column({ nullable: true })
  label: string;

  @Column({type: 'enum', enum: ESeatStatus, default: ESeatStatus.EMPTY})
  status: ESeatStatus;

  @ManyToOne(() => Room, (room) => room.seats)
  @JoinColumn({ name: 'roomId' })
  room: Room;

  @OneToMany(() => SeatHold, (seatHold) => seatHold.seat)
  seatHolds: SeatHold[];

  @OneToMany(() => Ticket, (ticket) => ticket.seat)
  tickets: Ticket[];
}

