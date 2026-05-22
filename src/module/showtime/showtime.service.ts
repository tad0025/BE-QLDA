import { Injectable, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Showtime } from './entities/showtime.entity';
import { Movie } from '../movie/entities/movie.entity';
import { CreateShowtimeDto, UpdateShowtimeDto } from './dto/showtime.dto';
import { ApiResponse } from '../../core/dto/ApiResponse.dto';
import { CustomException } from '../../core/exceptions/custom.exception';
import { EShowtimeStatus } from './enums/EShowTimeStatus.enum';
import { addMinutes } from 'date-fns';

@Injectable()
export class ShowtimeService {
  constructor(
    @InjectRepository(Showtime)
    private readonly showtimeRepository: Repository<Showtime>,
    @InjectRepository(Movie)
    private readonly movieRepository: Repository<Movie>,
  ) { }

  // ── Tính toán các mốc thời gian từ publicStartTime + movie.durationMinutes ──
  private calculateTimeSlots(
    publicStartTime: Date,
    durationMinutes: number,
    preShowMinutes: number,
    postMovieBufferMinutes: number,
  ) {
    const movieStartTime = addMinutes(publicStartTime, preShowMinutes);
    const movieEndTime = addMinutes(movieStartTime, durationMinutes);
    const roomReleaseTime = addMinutes(movieEndTime, postMovieBufferMinutes);
    return { movieStartTime, movieEndTime, roomReleaseTime };
  }

  // ── Kiểm tra trùng lịch trong cùng phòng ──
  private async checkConflict(
    roomId: number,
    publicStartTime: Date,
    roomReleaseTime: Date,
    excludeShowtimeId?: number,
  ): Promise<Showtime | null> {
    const qb = this.showtimeRepository
      .createQueryBuilder('showtime')
      .where('showtime.roomId = :roomId', { roomId })
      .andWhere('showtime.status != :cancelled', { cancelled: EShowtimeStatus.CANCELLED })
      .andWhere(
        '(showtime.publicStartTime < :roomRelease AND showtime.roomReleaseTime > :publicStart)',
        {
          roomRelease: roomReleaseTime.toISOString(),
          publicStart: publicStartTime.toISOString(),
        },
      );

    // Khi update, loại trừ chính suất chiếu đang sửa
    if (excludeShowtimeId) {
      qb.andWhere('showtime.id != :excludeId', { excludeId: excludeShowtimeId });
    }

    return qb.getOne();
  }

  async create(dto: CreateShowtimeDto): Promise<ApiResponse<Showtime>> {
    // 1. Lookup movie để lấy durationMinutes
    const movie = await this.movieRepository.findOne({ where: { id: dto.movieId } });
    if (!movie) {
      throw new CustomException(HttpStatus.NOT_FOUND, 'MOVIE_NOT_FOUND', 'Không tìm thấy phim');
    }

    // 2. Tính toán các mốc thời gian
    const preShow = dto.preShowMinutes ?? 10;
    const postBuffer = dto.postMovieBufferMinutes ?? 15;
    const publicStart = new Date(dto.publicStartTime);
    const { movieStartTime, movieEndTime, roomReleaseTime } = this.calculateTimeSlots(
      publicStart, movie.durationMinutes, preShow, postBuffer,
    );

    // 3. Check trùng lịch: publicStartTime → roomReleaseTime
    const conflicting = await this.checkConflict(dto.roomId, publicStart, roomReleaseTime);
    if (conflicting) {
      throw new CustomException(
        HttpStatus.BAD_REQUEST,
        'SHOWTIME_CONFLICT',
        `Suất chiếu bị trùng với suất chiếu #${conflicting.id} trong cùng phòng`,
      );
    }

    // 4. Tạo & lưu showtime
    const showtime = this.showtimeRepository.create({
      movieId: dto.movieId,
      roomId: dto.roomId,
      publicStartTime: publicStart,
      movieStartTime,
      movieEndTime,
      roomReleaseTime,
      format: dto.format,
      status: dto.status ?? EShowtimeStatus.SCHEDULED,
      preShowMinutes: preShow,
      postMovieBufferMinutes: postBuffer,
    });

    const saved = await this.showtimeRepository.save(showtime);
    return new ApiResponse(true, 'Tạo suất chiếu thành công', saved);
  }

  async findAll(page: number = 1, pageSize: number = 10): Promise<ApiResponse<Showtime[]>> {
    const skip = (page - 1) * pageSize;
    const [showtimes, totalItems] = await this.showtimeRepository.findAndCount({
      skip,
      take: pageSize,
      order: { publicStartTime: 'ASC' },
      relations: ['movie', 'room', 'room.cinema'],
    });
    const totalPages = Math.ceil(totalItems / pageSize);
    const response = new ApiResponse(true, 'Lấy danh sách suất chiếu thành công', showtimes);
    response.pagination = { page: Number(page), pageSize: Number(pageSize), totalItems, totalPages };
    return response;
  }

  async findOne(id: number): Promise<ApiResponse<Showtime>> {
    const showtime = await this.showtimeRepository.findOne({
      where: { id },
      relations: ['movie', 'room', 'ticketPrices'],
    });
    if (!showtime) {
      throw new CustomException(HttpStatus.NOT_FOUND, 'SHOWTIME_NOT_FOUND', 'Không tìm thấy suất chiếu');
    }
    return new ApiResponse(true, 'Lấy thông tin suất chiếu thành công', showtime);
  }

  async update(id: number, dto: UpdateShowtimeDto): Promise<ApiResponse<Showtime>> {
    // 1. Tìm showtime hiện tại (kèm movie để lấy durationMinutes)
    const showtime = await this.showtimeRepository.findOne({
      where: { id },
      relations: ['movie'],
    });
    if (!showtime) {
      throw new CustomException(HttpStatus.NOT_FOUND, 'SHOWTIME_NOT_FOUND', 'Không tìm thấy suất chiếu');
    }

    // 2. Merge các field được gửi lên
    const newPublicStart = dto.publicStartTime
      ? new Date(dto.publicStartTime)
      : new Date(showtime.publicStartTime);
    const newPreShow = dto.preShowMinutes ?? showtime.preShowMinutes;
    const newPostBuffer = dto.postMovieBufferMinutes ?? showtime.postMovieBufferMinutes;

    // 3. Tính lại các mốc thời gian
    const { movieStartTime, movieEndTime, roomReleaseTime } = this.calculateTimeSlots(
      newPublicStart, showtime.movie.durationMinutes, newPreShow, newPostBuffer,
    );

    // 4. Check trùng lịch (loại trừ chính nó)
    const conflicting = await this.checkConflict(
      showtime.roomId, newPublicStart, roomReleaseTime, id,
    );
    if (conflicting) {
      throw new CustomException(
        HttpStatus.BAD_REQUEST,
        'SHOWTIME_CONFLICT',
        `Suất chiếu bị trùng với suất chiếu #${conflicting.id} trong cùng phòng`,
      );
    }

    // 5. Cập nhật
    showtime.publicStartTime = newPublicStart;
    showtime.movieStartTime = movieStartTime;
    showtime.movieEndTime = movieEndTime;
    showtime.roomReleaseTime = roomReleaseTime;
    showtime.preShowMinutes = newPreShow;
    showtime.postMovieBufferMinutes = newPostBuffer;

    if (dto.format !== undefined) showtime.format = dto.format;
    if (dto.status !== undefined) showtime.status = dto.status;

    const updated = await this.showtimeRepository.save(showtime);
    return new ApiResponse(true, 'Cập nhật suất chiếu thành công', updated);
  }

  async remove(id: number): Promise<ApiResponse<null>> {
    const showtime = await this.showtimeRepository.findOne({ where: { id } });
    if (!showtime) {
      throw new CustomException(HttpStatus.NOT_FOUND, 'SHOWTIME_NOT_FOUND', 'Không tìm thấy suất chiếu');
    }
    await this.showtimeRepository.remove(showtime);
    return new ApiResponse(true, 'Xóa suất chiếu thành công');
  }

  async getByMovieId(movieId: number): Promise<ApiResponse<any>> {
    const showtimes = await this.showtimeRepository.find({
      where: { movieId },
      relations: ['room', 'room.cinema'],
      order: { publicStartTime: 'ASC' },
    });

    // Nhóm theo ngày
    const grouped = this.groupByDate(showtimes);
    return new ApiResponse(true, 'Lấy suất chiếu theo phim thành công', grouped);
  }

  async getByCinemaId(cinemaId: number): Promise<ApiResponse<any>> {
    const showtimes = await this.showtimeRepository
      .createQueryBuilder('showtime')
      .leftJoinAndSelect('showtime.movie', 'movie')
      .leftJoinAndSelect('showtime.room', 'room')
      .where('room.cinemaId = :cinemaId', { cinemaId })
      .orderBy('showtime.publicStartTime', 'ASC')
      .getMany();

    // Nhóm theo ngày
    const grouped = this.groupByDate(showtimes);
    return new ApiResponse(true, 'Lấy suất chiếu theo rạp thành công', grouped);
  }

  private groupByDate(showtimes: Showtime[]): Record<string, Showtime[]> {
    const grouped: Record<string, Showtime[]> = {};
    for (const showtime of showtimes) {
      const dateKey = new Date(showtime.publicStartTime).toISOString().split('T')[0];
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(showtime);
    }
    return grouped;
  }
}
