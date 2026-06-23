import { Injectable, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Booking } from '../booking/entities/booking.entity';
import { Movie } from '../movie/entities/movie.entity';
import { Showtime } from '../showtime/entities/showtime.entity';
import { Ticket } from '../ticket/entities/ticket.entity';
import { Cinema } from '../cinema/entities/cinema.entity';
import { ApiResponse } from '../../core/dto/ApiResponse.dto';
import { CustomException } from '../../core/exceptions/custom.exception';
import { EBookingStatus } from '../booking/enums/booking.enum';

@Injectable()
export class StatisticsService {
  constructor(
    @InjectRepository(Booking)
    private bookingRepository: Repository<Booking>,
    @InjectRepository(Movie)
    private movieRepository: Repository<Movie>,
    @InjectRepository(Showtime)
    private showtimeRepository: Repository<Showtime>,
    @InjectRepository(Ticket)
    private ticketRepository: Repository<Ticket>,
    @InjectRepository(Cinema)
    private cinemaRepository: Repository<Cinema>,
  ) {}

  async getRevenueStatistics(timeFrame: 'day' | 'week' | 'month' | 'year'): Promise<ApiResponse<any>> {
    try {
      const queryBuilder = this.bookingRepository.createQueryBuilder('booking')
        .select('SUM(booking.totalAmount)', 'totalRevenue')
        .where('booking.status = :status', { status: EBookingStatus.PAID });

      let groupByFormat = '';
      let selectFormat = '';

      // Dựa trên timeFrame để thiết lập cách lấy ngày tháng (MySQL syntax)
      switch (timeFrame) {
        case 'day':
          groupByFormat = '%Y-%m-%d';
          selectFormat = '%Y-%m-%d';
          break;
        case 'week':
          groupByFormat = '%x-%v'; // Năm-Tuần
          selectFormat = '%x-%v';
          break;
        case 'month':
          groupByFormat = '%Y-%m';
          selectFormat = '%Y-%m';
          break;
        case 'year':
          groupByFormat = '%Y';
          selectFormat = '%Y';
          break;
        default:
          groupByFormat = '%Y-%m';
          selectFormat = '%Y-%m';
      }

      queryBuilder.addSelect(`DATE_FORMAT(booking.createdAt, '${selectFormat}')`, 'period');
      queryBuilder.groupBy(`DATE_FORMAT(booking.createdAt, '${groupByFormat}')`);
      queryBuilder.orderBy('period', 'ASC');

      const rawData = await queryBuilder.getRawMany();

      const formattedData = rawData.map(item => ({
        period: item.period,
        revenue: Number(item.totalRevenue) || 0,
      }));

      return new ApiResponse(true, 'Lấy thống kê doanh thu thành công', formattedData);
    } catch (error) {
      throw new CustomException(
        HttpStatus.INTERNAL_SERVER_ERROR,
        'STATISTICS_ERROR',
        'Lỗi khi lấy thống kê doanh thu',
      );
    }
  }

  async getMoviePerformance(): Promise<ApiResponse<any>> {
    try {
      // 1. Lấy thông tin phim và tính tổng doanh thu + vé bán ra
      const moviesStats = await this.movieRepository.createQueryBuilder('movie')
        .leftJoin('movie.showtimes', 'showtime')
        .leftJoin('showtime.tickets', 'ticket', 'ticket.status != :ticketStatus', { ticketStatus: 'CANCELLED' })
        .leftJoin('ticket.booking', 'booking', 'booking.status = :bookingStatus', { bookingStatus: EBookingStatus.PAID })
        .select([
          'movie.id AS id',
          'movie.title AS title',
          'movie.poster AS poster',
        ])
        .addSelect('COUNT(ticket.id)', 'ticketsSold')
        .addSelect('SUM(ticket.price)', 'revenue')
        .groupBy('movie.id')
        .orderBy('ticketsSold', 'DESC')
        .getRawMany();

      // 2. Tính tỷ lệ lấp đầy (Occupancy Rate)
      // Tỷ lệ lấp đầy = Tổng vé / (Tổng suất chiếu * Tổng số ghế phòng)
      const performanceData: any[] = [];

      for (const stat of moviesStats) {
        const movieId = stat.id;
        
        // Lấy tổng số suất chiếu và tổng số ghế tương ứng
        const showtimes = await this.showtimeRepository.createQueryBuilder('showtime')
          .leftJoinAndSelect('showtime.room', 'room')
          .where('showtime.movieId = :movieId', { movieId })
          .getMany();

        let totalCapacity = 0;
        showtimes.forEach(st => {
          if (st.room && st.room.totalSeats) {
            totalCapacity += st.room.totalSeats;
          }
        });

        const ticketsSold = Number(stat.ticketsSold) || 0;
        let occupancyRate = 0;
        if (totalCapacity > 0) {
          occupancyRate = Math.round((ticketsSold / totalCapacity) * 100);
        }

        performanceData.push({
          id: movieId,
          title: stat.title,
          poster: stat.poster,
          ticketsSold,
          revenue: Number(stat.revenue) || 0,
          occupancyRate,
        });
      }

      return new ApiResponse(true, 'Lấy thống kê hiệu suất phim thành công', performanceData);
    } catch (error) {
      throw new CustomException(
        HttpStatus.INTERNAL_SERVER_ERROR,
        'STATISTICS_ERROR',
        'Lỗi khi lấy thống kê hiệu suất phim',
      );
    }
  }

  async getSummary(): Promise<ApiResponse<any>> {
    try {
      const { totalRevenue } = await this.bookingRepository.createQueryBuilder('booking')
        .select('SUM(booking.totalAmount)', 'totalRevenue')
        .where('booking.status = :status', { status: EBookingStatus.PAID })
        .getRawOne();

      const totalTickets = await this.ticketRepository.count({
        where: { booking: { status: EBookingStatus.PAID } },
        relations: ['booking'],
      });

      const totalCinemas = await this.cinemaRepository.count();

      const activeMovies = await this.movieRepository.createQueryBuilder('movie')
        .where('movie.status IN (:...statuses)', { statuses: ['NOW_SHOWING', 'ACTIVE', 'SHOWING'] })
        .getCount();

      return new ApiResponse(true, 'Lấy tổng quan thành công', {
        revenue: Number(totalRevenue) || 0,
        tickets: totalTickets,
        cinemas: totalCinemas,
        activeMovies,
      });
    } catch (error) {
      throw new CustomException(
        HttpStatus.INTERNAL_SERVER_ERROR,
        'STATISTICS_ERROR',
        'Lỗi khi lấy tổng quan',
      );
    }
  }
}
