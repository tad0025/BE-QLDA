import { Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn, UpdateDateColumn, CreateDateColumn } from 'typeorm';
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

  @Column({ type: 'enum', enum: EPaymentChannel, default: EPaymentChannel.ONLINE })
  channel: EPaymentChannel;

  @Column()
  amount: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ nullable: true })
  transactionCode: string;

  @Column({ type: 'enum', enum: EPaymentStatus, default: EPaymentStatus.PENDING })
  status: EPaymentStatus;

  @Column({ type: 'timestamp', nullable: true })
  paymentDate: Date;

  @Column({ nullable: true, length: 2048 })
  payUrl: string;

  @Column({ nullable: true })
  gatewayOrderId: string;

  @OneToOne(() => Booking, (booking) => booking.payment)
  @JoinColumn({ name: 'bookingId' })
  booking: Booking;
}
