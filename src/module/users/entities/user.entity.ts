import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, OneToMany } from 'typeorm';
import { EUserRole } from '../../users/enums/user.enum';

@Entity('users')
export class User {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ unique: true })
    email: string;

    @Column({ select: false })
    password: string;

    @Column({ nullable: true })
    fullName: string;

    @Column({ type: 'enum', enum: EUserRole, default: EUserRole.USER })
    role: EUserRole;

    @Column({ nullable: true })
    avatarUrl: string;

    @Column({ nullable: true })
    phone: string;

    @Column({ nullable: true })
    gender: string;

    @Column({ nullable: true })
    dateOfBirth: string;

    @Column({ default: 0 })
    tokenVersion: number;

    @CreateDateColumn()
    createdAt: Date;
}