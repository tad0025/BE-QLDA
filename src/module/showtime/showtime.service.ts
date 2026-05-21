import { Injectable, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, MoreThan } from 'typeorm';
import { Showtime } from './entities/showtime.entity';
import { CreateShowtimeDto, UpdateShowtimeDto } from './dto/showtime.dto';
import { ApiResponse } from '../../core/dto/ApiResponse.dto';
import { CustomException } from '../../core/exceptions/custom.exception';
import { EShowtimeStatus } from './enums/EShowTimeStatus.enum';

@Injectable()
export class ShowtimeService {
  constructor(
    @InjectRepository(Showtime)
    private readonly showtimeRepository: Repository<Showtime>,
  ) {}

  async create(dto: CreateShowtimeDto): Promise<ApiResponse<Showtime>> {
    // Tính thời gian kết thúc bao gồm thời gian dọn phòng
    const movieEndTime = new Date(dto.movieEndTime);
    const cleaningMinutes = dto.cleaningMinutes || 0;
    const roomReleaseTime = new Date(dto.roomReleaseTime);

    // Kiểm tra trùng suất chiếu trong cùng phòng
    const conflicting = await this.showtimeRepository
      .createQueryBuilder('showtime')
      .where('showtime.roomId = :roomId', { roomId: dto.roomId })
      .andWhere('showtime.status != :cancelled', { cancelled: EShowtimeStatus.CANCELLED })
      .andWhere(
        '(showtime.movieStartTime < :roomRelease AND showtime.roomReleaseTime > :movieStart)',
        {
          roomRelease: roomReleaseTime.toISOString(),
          movieStart: new Date(dto.movieStartTime).toISOString(),
        },
      )
      .getOne();

    if (conflicting) {
      throw new CustomException(
        HttpStatus.BAD_REQUEST,
        'SHOWTIME_CONFLICT',
        `Suất chiếu bị trùng với suất chiếu #${conflicting.id} trong cùng phòng`,
      );
    }

    const showtime = this.showtimeRepository.create({
      ...dto,
      status: dto.status || EShowtimeStatus.SCHEDULED,
      preShowMinutes: dto.preShowMinutes || 0,
      exitBufferMinutes: dto.exitBufferMinutes || 0,
      cleaningMinutes: cleaningMinutes,
      entryBufferMinutes: dto.entryBufferMinutes || 0,
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
      relations: ['movie', 'room'],
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
    const showtime = await this.showtimeRepository.findOne({ where: { id } });
    if (!showtime) {
      throw new CustomException(HttpStatus.NOT_FOUND, 'SHOWTIME_NOT_FOUND', 'Không tìm thấy suất chiếu');
    }
    Object.assign(showtime, dto);
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
