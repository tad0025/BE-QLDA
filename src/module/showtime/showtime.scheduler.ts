import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, In } from 'typeorm';
import { Showtime } from './entities/showtime.entity';
import { Movie } from '../movie/entities/movie.entity';
import { EShowtimeStatus } from './enums/EShowTimeStatus.enum';
import { EMovieStatus } from '../movie/enums/movie.enum';

@Injectable()
export class ShowtimeSchedulerService {
  private readonly logger = new Logger(ShowtimeSchedulerService.name);

  constructor(
    @InjectRepository(Showtime)
    private readonly showtimeRepository: Repository<Showtime>,

    @InjectRepository(Movie)
    private readonly movieRepository: Repository<Movie>,
  ) {}

  /**
   * Chạy mỗi phút — cập nhật trạng thái suất chiếu theo thời gian thực:
   *   SCHEDULED  → ACTIVE    : khi đã đến publicStartTime
   *   ACTIVE     → COMPLETED : khi đã qua roomReleaseTime
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async syncShowtimeStatuses(): Promise<void> {
    const now = new Date();

    try {
      // 1. SCHEDULED → ACTIVE: publicStartTime đã đến
      const toActivate = await this.showtimeRepository.find({
        where: {
          status: EShowtimeStatus.SCHEDULED,
          publicStartTime: LessThanOrEqual(now),
        },
      });

      if (toActivate.length > 0) {
        await this.showtimeRepository.update(
          toActivate.map((s) => s.id),
          { status: EShowtimeStatus.ACTIVE },
        );

        // Tự động chuyển phim sang NOW_SHOWING nếu đang là COMING_SOON
        const movieIdsToActivate = [...new Set(toActivate.map((s) => s.movieId))];
        if (movieIdsToActivate.length > 0) {
          await this.movieRepository.update(
            { id: In(movieIdsToActivate), status: EMovieStatus.COMING_SOON },
            { status: EMovieStatus.NOW_SHOWING },
          );
        }

        this.logger.log(
          `[Scheduler] Activated ${toActivate.length} showtime(s): [${toActivate.map((s) => s.id).join(', ')}]`,
        );
      }

      // 2. ACTIVE → COMPLETED: roomReleaseTime đã qua
      const toComplete = await this.showtimeRepository.find({
        where: {
          status: EShowtimeStatus.ACTIVE,
          roomReleaseTime: LessThanOrEqual(now),
        },
      });

      if (toComplete.length > 0) {
        await this.showtimeRepository.update(
          toComplete.map((s) => s.id),
          { status: EShowtimeStatus.COMPLETED },
        );
        this.logger.log(
          `[Scheduler] Completed ${toComplete.length} showtime(s): [${toComplete.map((s) => s.id).join(', ')}]`,
        );
      }
    } catch (error) {
      this.logger.error('[Scheduler] syncShowtimeStatuses failed', error);
    }
  }

  /**
   * Chạy mỗi ngày lúc 00:05 — huỷ các suất chiếu SCHEDULED của phim đã hết screeningEndDate.
   * Không huỷ ACTIVE/COMPLETED vì chúng đang hoặc đã diễn ra.
   */
  @Cron('5 0 * * *')
  async cancelExpiredScreenings(): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    try {
      // Tìm các phim đã hết hạn screeningEndDate (không null)
      const expiredMovies = await this.movieRepository
        .createQueryBuilder('movie')
        .where('movie.screeningEndDate IS NOT NULL')
        .andWhere('movie.screeningEndDate < :today', { today })
        .getMany();

      if (expiredMovies.length === 0) return;

      const expiredMovieIds = expiredMovies.map((m) => m.id);

      // Chỉ huỷ các suất chiếu SCHEDULED (chưa diễn ra) của phim đã hết hạn
      const toCancel = await this.showtimeRepository.find({
        where: {
          movieId: In(expiredMovieIds),
          status: EShowtimeStatus.SCHEDULED,
        },
      });

      if (toCancel.length > 0) {
        await this.showtimeRepository.update(
          toCancel.map((s) => s.id),
          { status: EShowtimeStatus.CANCELLED },
        );
        this.logger.log(
          `[Scheduler] Cancelled ${toCancel.length} scheduled showtime(s) for expired movies: [${expiredMovieIds.join(', ')}]`,
        );
      }

      // Cập nhật EMovieStatus → STOPPED cho các phim đã hết screeningEndDate
      await this.movieRepository.update(
        { id: In(expiredMovieIds) },
        { status: EMovieStatus.STOPPED },
      );
      this.logger.log(
        `[Scheduler] Marked ${expiredMovies.length} movie(s) as STOPPED: [${expiredMovieIds.join(', ')}]`,
      );
    } catch (error) {
      this.logger.error('[Scheduler] cancelExpiredScreenings failed', error);
    }
  }
}
