import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Booking } from './booking.entity';
import { ConcessionProduct } from '../../concession/entities/concession-product.entity';

@Entity('booking_concessions')
export class BookingConcession {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  bookingId: number;

  @Column()
  productId: number;

  @Column()
  quantity: number;

  @Column()
  unitPrice: number;

  @Column()
  subtotal: number;

  @ManyToOne(() => Booking, (booking) => booking.bookingConcessions)
  @JoinColumn({ name: 'bookingId' })
  booking: Booking;

  @ManyToOne(() => ConcessionProduct, (product) => product.bookingConcessions)
  @JoinColumn({ name: 'productId' })
  product: ConcessionProduct;
}

