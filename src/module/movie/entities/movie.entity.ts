import { Entity, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { EMovieStatus } from '../enums/movie.enum';
import { Showtime } from '../../showtime/entities/showtime.entity';
import { Promotion } from '../../promotion/entities/promotion.entity';

@Entity('movies')
export class Movie {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column()
  genre: string;

  @Column()
  durationMinutes: number;

  @Column({ nullable: true })
  director: string;

  @Column({ nullable: true })
  cast: string;

  @Column({ type: 'date', nullable: true })
  releaseDate: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ nullable: true })
  language: string;

  @Column({ nullable: true })
  ageLimit: number;

  @Column({ nullable: true })
  posterUrl: string;

  @Column({ nullable: true })
  trailerUrl: string;

  @Column({ type: 'enum', enum: EMovieStatus })
  status: EMovieStatus;

  @OneToMany(() => Showtime, (showtime) => showtime.movie)
  showtimes: Showtime[];

  @OneToMany(() => Promotion, (promotion) => promotion.movie)
  promotions: Promotion[];
}

