import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual, LessThanOrEqual, Between } from 'typeorm';
import { Movie } from '../movie/entities/movie.entity';
import { Cinema } from '../cinema/entities/cinema.entity';
import { Showtime } from '../showtime/entities/showtime.entity';
import { Promotion } from '../promotion/entities/promotion.entity';
import { EMovieStatus } from '../movie/enums/movie.enum';
import { ECinemaStatus } from '../cinema/enums/cinema.enum';
import { EShowtimeStatus } from '../showtime/enums/EShowTimeStatus.enum';
import { ApiResponse } from '../../core/dto/ApiResponse.dto';

@Injectable()
export class HomeService {
  constructor(
    @InjectRepository(Movie)
    private readonly movieRepository: Repository<Movie>,
    @InjectRepository(Cinema)
    private readonly cinemaRepository: Repository<Cinema>,
    @InjectRepository(Showtime)
    private readonly showtimeRepository: Repository<Showtime>,
    @InjectRepository(Promotion)
    private readonly promotionRepository: Repository<Promotion>,
  ) {}

  async getHomePageData(): Promise<ApiResponse<any>> {
    // 1. Phim đang chiếu (NOW_SHOWING) - lấy 8 phim mới nhất
    const nowShowing = await this.movieRepository.find({
      where: { status: EMovieStatus.NOW_SHOWING },
      order: { releaseDate: 'DESC', id: 'DESC' },
      take: 8,
    });

    // 2. Phim sắp chiếu (COMING_SOON) - lấy 8 phim
    const comingSoon = await this.movieRepository.find({
      where: { status: EMovieStatus.COMING_SOON },
      order: { releaseDate: 'ASC', id: 'DESC' },
      take: 8,
    });

    // 3. Thống kê tổng quan
    const totalCinemas = await this.cinemaRepository.count({
      where: { status: ECinemaStatus.ACTIVE },
    });

    // Suất chiếu hôm nay
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const todayShowtimes = await this.showtimeRepository.count({
      where: {
        publicStartTime: Between(todayStart, todayEnd),
        status: EShowtimeStatus.SCHEDULED,
      },
    });

    // Suất chiếu đang chiếu (ACTIVE)
    const activeShowtimes = await this.showtimeRepository.count({
      where: {
        publicStartTime: Between(todayStart, todayEnd),
        status: EShowtimeStatus.ACTIVE,
      },
    });

    // 4. Suất chiếu sắp tới hôm nay (upcoming today) - kèm thông tin phim + phòng
    const now = new Date();
    const upcomingShowtimes = await this.showtimeRepository.find({
      where: {
        publicStartTime: Between(now, todayEnd),
        status: EShowtimeStatus.SCHEDULED,
      },
      relations: ['movie', 'room', 'room.cinema'],
      order: { publicStartTime: 'ASC' },
      take: 5,
    });

    // 5. Khuyến mãi đang hoạt động
    const today = new Date();
    const activePromotions = await this.promotionRepository.find({
      where: {
        isActive: true,
        startDate: LessThanOrEqual(today),
        endDate: MoreThanOrEqual(today),
      },
      relations: ['movie'],
      order: { endDate: 'ASC' },
      take: 4,
    });

    // 6. Phim được đánh giá cao nhất (từ phim đang chiếu) - dùng cho "Audience Pick"
    const topRated = await this.movieRepository
      .createQueryBuilder('movie')
      .where('movie.status = :status', { status: EMovieStatus.NOW_SHOWING })
      .orderBy('movie.id', 'DESC')
      .getOne();

    // Format data
    const formatMovie = (movie: Movie) => ({
      id: movie.id,
      title: movie.title,
      genre: movie.genre,
      durationMinutes: movie.durationMinutes,
      director: movie.director,
      cast: movie.cast,
      posterUrl: movie.posterUrl,
      trailerUrl: movie.trailerUrl,
      releaseDate: movie.releaseDate,
      description: movie.description,
      language: movie.language,
      ageLimit: movie.ageLimit,
      status: movie.status,
    });

    const formatShowtime = (showtime: Showtime) => ({
      id: showtime.id,
      publicStartTime: showtime.publicStartTime,
      format: showtime.format,
      status: showtime.status,
      movie: showtime.movie ? {
        id: showtime.movie.id,
        title: showtime.movie.title,
      } : null,
      room: showtime.room ? {
        id: showtime.room.id,
        name: showtime.room.name,
        cinema: showtime.room.cinema ? {
          id: showtime.room.cinema.id,
          name: showtime.room.cinema.name,
        } : null,
      } : null,
    });

    const formatPromotion = (promo: Promotion) => ({
      id: promo.id,
      code: promo.code,
      description: promo.description,
      discountType: promo.discountType,
      discountValue: promo.discountValue,
      startDate: promo.startDate,
      endDate: promo.endDate,
      movie: promo.movie ? {
        id: promo.movie.id,
        title: promo.movie.title,
      } : null,
    });

    const data = {
      nowShowing: nowShowing.map(formatMovie),
      comingSoon: comingSoon.map(formatMovie),
      stats: {
        totalCinemas,
        todayShowtimes: todayShowtimes + activeShowtimes,
        totalNowShowing: nowShowing.length,
        totalComingSoon: comingSoon.length,
      },
      upcomingShowtimes: upcomingShowtimes.map(formatShowtime),
      activePromotions: activePromotions.map(formatPromotion),
      audiencePick: topRated ? formatMovie(topRated) : null,
    };

    return new ApiResponse(true, 'Lấy dữ liệu trang chủ thành công', data);
  }
}
