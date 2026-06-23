import { Entity, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Room } from './room.entity';
import { ECinemaStatus } from '../enums/cinema.enum';

@Entity('cinemas')
export class Cinema {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  address: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ type: 'enum', enum: ECinemaStatus })
  status: ECinemaStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ nullable: true })
  email: string;

  @OneToMany(() => Room, (room) => room.cinema)
  rooms: Room[];
}

