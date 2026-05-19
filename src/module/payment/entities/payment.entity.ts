import { Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn } from 'typeorm';
import { EPaymentChannel, EPaymentMethod, EPaymentStatus } from '../enums/payment.enum';
import { Booking } from '../../booking/entities/booking.entity';

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  bookingId: number;

  @Column({ type: 'enum', enum: EPaymentMethod })
  method: EPaymentMethod;

  @Column({ type: 'enum', enum: EPaymentChannel })
  channel: EPaymentChannel;

  @Column()
  amount: number;

  @Column({ nullable: true })
  transactionCode: string;

  @Column({ type: 'enum', enum: EPaymentStatus, default: EPaymentStatus.PENDING })
  status: EPaymentStatus;

  @Column({ type: 'timestamp', nullable: true })
  paymentDate: Date;

  @OneToOne(() => Booking, (booking) => booking.payment)
  @JoinColumn({ name: 'bookingId' })
  booking: Booking;
}

