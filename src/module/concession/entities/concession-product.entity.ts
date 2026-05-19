import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { BookingConcession } from '../../booking/entities/booking-concession.entity';

@Entity('concession_products')
export class ConcessionProduct {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  price: number;

  @Column({ default: 0 })
  stockQuantity: number;

  @OneToMany(() => BookingConcession, (bookingConcession) => bookingConcession.product)
  bookingConcessions: BookingConcession[];
}

