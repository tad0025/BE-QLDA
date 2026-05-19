import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { EDiscountType } from '../enums/promotion.enum';
import { Movie } from '../../movie/entities/movie.entity';
import { Booking } from '../../booking/entities/booking.entity';

@Entity('promotions')
export class Promotion {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  code: string;

  @Column({ nullable: true })
  description: string;

  @Column({ type: 'enum', enum: EDiscountType })
  discountType: EDiscountType;

  @Column()
  discountValue: number;

  @Column({ nullable: true })
  movieId: number;

  @Column({ type: 'date' })
  startDate: Date;

  @Column({ type: 'date' })
  endDate: Date;

  @Column({ nullable: true })
  maxUsage: number;

  @Column({ default: 0 })
  usedCount: number;

  @Column({ default: true })
  isActive: boolean;

  @ManyToOne(() => Movie, (movie) => movie.promotions, { nullable: true })
  @JoinColumn({ name: 'movieId' })
  movie: Movie;

  @OneToMany(() => Booking, (booking) => booking.promotion)
  bookings: Booking[];
}

