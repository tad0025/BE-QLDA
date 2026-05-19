import { Entity, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn } from 'typeorm';
import { EUserRole, EUserStatus } from '../enums/user.enum';
import { Booking } from '../../booking/entities/booking.entity';
import { SeatHold } from '../../booking/entities/seat-hold.entity';
import { Notification } from '../../notification/entities/notification.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  fullName: string;

  @Column({ type: 'date', nullable: true })
  dateOfBirth: Date;

  @Column({ nullable: true })
  gender: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ unique: true })
  email: string;

  @Column({ select: false })
  password: string;

  @Column({ type: 'enum', enum: EUserRole })
  role: EUserRole;

  @Column({ type: 'enum', enum: EUserStatus, default: EUserStatus.ACTIVE })
  status: EUserStatus;

  @Column({ default: 0 })
  loyaltyPoints: number;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @Column({ default: 0 })
  tokenVersion: number;

  @OneToMany(() => Booking, (booking) => booking.user)
  bookings: Booking[];

  @OneToMany(() => Booking, (booking) => booking.staff)
  staffBookings: Booking[];

  @OneToMany(() => SeatHold, (seatHold) => seatHold.user)
  seatHolds: SeatHold[];

  @OneToMany(() => Notification, (notification) => notification.user)
  notifications: Notification[];
}