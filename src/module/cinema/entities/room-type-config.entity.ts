import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Unique,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ERoomType } from '../enums/cinema.enum';

@Entity('room_type_configs')
@Unique(['roomType'])
export class RoomTypeConfig {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'enum', enum: ERoomType })
  roomType: ERoomType;

  @Column({ type: 'int' })
  rows: number;

  @Column({ type: 'int' })
  columns: number;

  @Column({ type: 'int' })
  totalSeats: number;

  @Column({ type: 'boolean', default: false })
  isCouple: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
