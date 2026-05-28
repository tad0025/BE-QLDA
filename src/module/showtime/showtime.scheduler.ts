import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, In, Not } from 'typeorm';
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
   *
   * Đồng thời đảm bảo movie COMING_SOON → NOW_SHOWING nếu có bất kỳ
   * showtime nào đã ACTIVE hoặc COMPLETED (phòng trường hợp scheduler
   * bị miss lúc showtime chuyển trạng thái).
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

      // 3. COMING_SOON → NOW_SHOWING: Nếu phim có BẤT KỲ showtime nào
      //    đang ACTIVE hoặc đã COMPLETED → phim phải là NOW_SHOWING.
      //    (Xử lý edge case: scheduler bị miss, hoặc showtime nhảy thẳng
      //     SCHEDULED → COMPLETED khi BE restart)
      const comingSoonMovies = await this.movieRepository.find({
        where: { status: EMovieStatus.COMING_SOON },
      });

      if (comingSoonMovies.length > 0) {
        const movieIdsToActivate: number[] = [];

        for (const movie of comingSoonMovies) {
          const hasStartedShowtime = await this.showtimeRepository.findOne({
            where: {
              movieId: movie.id,
              status: In([EShowtimeStatus.ACTIVE, EShowtimeStatus.COMPLETED]),
            },
          });

          if (hasStartedShowtime) {
            movieIdsToActivate.push(movie.id);
          }
        }

        if (movieIdsToActivate.length > 0) {
          await this.movieRepository.update(
            { id: In(movieIdsToActivate) },
            { status: EMovieStatus.NOW_SHOWING },
          );
          this.logger.log(
            `[Scheduler] Movies COMING_SOON → NOW_SHOWING: [${movieIdsToActivate.join(', ')}]`,
          );
        }
      }
    } catch (error) {
      this.logger.error('[Scheduler] syncShowtimeStatuses failed', error);
    }
  }

  /**
   * Chạy mỗi ngày lúc 00:05 — xử lý phim hết hạn chiếu:
   *
   * Case A: screeningEndDate đã qua → huỷ SCHEDULED showtimes + movie STOPPED
   * Case B: Phim NOW_SHOWING không còn showtime SCHEDULED/ACTIVE nào
   *         (tất cả đều COMPLETED/CANCELLED) → movie STOPPED
   *         (kể cả khi screeningEndDate = null)
   */
  @Cron('5 0 * * *')
  async cancelExpiredScreenings(): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    try {
      // ── Case A: screeningEndDate đã qua ──
      const expiredMovies = await this.movieRepository
        .createQueryBuilder('movie')
        .where('movie.screeningEndDate IS NOT NULL')
        .andWhere('movie.screeningEndDate < :today', { today })
        .andWhere('movie.status != :stopped', { stopped: EMovieStatus.STOPPED })
        .getMany();

      if (expiredMovies.length > 0) {
        const expiredMovieIds = expiredMovies.map((m) => m.id);

        // Huỷ các suất chiếu SCHEDULED (chưa diễn ra)
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

        await this.movieRepository.update(
          { id: In(expiredMovieIds) },
          { status: EMovieStatus.STOPPED },
        );
        this.logger.log(
          `[Scheduler] Marked ${expiredMovies.length} movie(s) as STOPPED (screeningEndDate expired): [${expiredMovieIds.join(', ')}]`,
        );
      }

      // ── Case B: Phim NOW_SHOWING mà tất cả showtime đã kết thúc ──
      // (không còn showtime SCHEDULED hoặc ACTIVE nào)
      const nowShowingMovies = await this.movieRepository.find({
        where: { status: EMovieStatus.NOW_SHOWING },
      });

      if (nowShowingMovies.length > 0) {
        const movieIdsToStop: number[] = [];

        for (const movie of nowShowingMovies) {
          // Kiểm tra có còn showtime nào chưa kết thúc
          const pendingShowtime = await this.showtimeRepository.findOne({
            where: {
              movieId: movie.id,
              status: In([EShowtimeStatus.SCHEDULED, EShowtimeStatus.ACTIVE]),
            },
          });

          // Kiểm tra phim có ít nhất 1 showtime đã được tạo
          const hasAnyShowtime = await this.showtimeRepository.findOne({
            where: { movieId: movie.id },
          });

          // Nếu có showtime nhưng không còn cái nào pending → phim đã hết lịch
          if (hasAnyShowtime && !pendingShowtime) {
            movieIdsToStop.push(movie.id);
          }
        }

        if (movieIdsToStop.length > 0) {
          await this.movieRepository.update(
            { id: In(movieIdsToStop) },
            { status: EMovieStatus.STOPPED },
          );
          this.logger.log(
            `[Scheduler] Marked ${movieIdsToStop.length} movie(s) as STOPPED (all showtimes completed): [${movieIdsToStop.join(', ')}]`,
          );
        }
      }
    } catch (error) {
      this.logger.error('[Scheduler] cancelExpiredScreenings failed', error);
    }
  }
}
