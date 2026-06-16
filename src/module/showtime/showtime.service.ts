import { Injectable, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Showtime } from './entities/showtime.entity';
import { Movie } from '../movie/entities/movie.entity';
import {
  CreateShowtimeDto,
  UpdateShowtimeDto,
  BulkCreateShowtimeDto,
} from './dto/showtime.dto';
import { ApiResponse } from '../../core/dto/ApiResponse.dto';
import { CustomException } from '../../core/exceptions/custom.exception';
import { EShowtimeStatus } from './enums/EShowTimeStatus.enum';
import { addMinutes } from 'date-fns';
import { Room } from '../cinema/entities/room.entity';
import {
  ERoomStatus,
  ERoomType,
  ESeatStatus,
} from '../cinema/enums/cinema.enum';
import { EMovieFormat } from '../movie/enums/movie.enum';
import { ESeatHoldStatus } from '../booking/enums/booking.enum';
@Injectable()
export class ShowtimeService {
  constructor(
    @InjectRepository(Showtime)
    private readonly showtimeRepository: Repository<Showtime>,

    @InjectRepository(Movie)
    private readonly movieRepository: Repository<Movie>,

    @InjectRepository(Room)
    private readonly roomRepository: Repository<Room>,
  ) {}

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
      .andWhere('showtime.status != :cancelled', {
        cancelled: EShowtimeStatus.CANCELLED,
      })
      .andWhere(
        '(showtime.publicStartTime < :roomRelease AND showtime.roomReleaseTime > :publicStart)',
        {
          roomRelease: roomReleaseTime,
          publicStart: publicStartTime,
        },
      );

    // Khi update, loại trừ chính suất chiếu đang sửa
    if (excludeShowtimeId) {
      qb.andWhere('showtime.id != :excludeId', {
        excludeId: excludeShowtimeId,
      });
    }

    return qb.getOne();
  }

  async create(dto: CreateShowtimeDto): Promise<ApiResponse<Showtime>> {
    // 1. Lookup movie để lấy durationMinutes
    const movie = await this.movieRepository.findOne({
      where: { id: dto.movieId },
    });
    if (!movie) {
      throw new CustomException(
        HttpStatus.NOT_FOUND,
        'MOVIE_NOT_FOUND',
        'Không tìm thấy phim',
      );
    }

    const room = await this.roomRepository.findOne({
      where: { id: dto.roomId },
    });
    if (!room) {
      throw new CustomException(
        HttpStatus.NOT_FOUND,
        'ROOM_NOT_FOUND',
        'Không tìm thấy phòng chiếu',
      );
    }

    if (room.status !== ERoomStatus.ACTIVE) {
      throw new CustomException(
        HttpStatus.BAD_REQUEST,
        'ROOM_NOT_ACTIVE',
        'Phòng chiếu không ở trạng thái ACTIVE',
      );
    }

    // 2. Tính toán các mốc thời gian
    const preShow = dto.preShowMinutes ?? 10;
    const postBuffer = dto.postMovieBufferMinutes ?? 15;
    const publicStart = new Date(dto.publicStartTime);

    // Kiểm tra screeningEndDate: phim có còn trong thời hạn công chiếu không?
    if (movie.screeningEndDate) {
      const endDate = new Date(movie.screeningEndDate);
      endDate.setHours(23, 59, 59, 999); // hết ngày cuối cùng
      if (publicStart > endDate) {
        throw new CustomException(
          HttpStatus.BAD_REQUEST,
          'MOVIE_SCREENING_EXPIRED',
          `Phim "${movie.title}" chỉ được chiếu đến ngày ${new Date(movie.screeningEndDate).toLocaleDateString('vi-VN')}`,
        );
      }
    }

    const { movieStartTime, movieEndTime, roomReleaseTime } =
      this.calculateTimeSlots(
        publicStart,
        movie.durationMinutes,
        preShow,
        postBuffer,
      );

    // 3. Check trùng lịch: publicStartTime → roomReleaseTime
    const conflicting = await this.checkConflict(
      dto.roomId,
      publicStart,
      roomReleaseTime,
    );
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

  async bulkCreate(dto: BulkCreateShowtimeDto): Promise<ApiResponse<any>> {
    // 1. Lookup movie
    const movie = await this.movieRepository.findOne({
      where: { id: dto.movieId },
    });
    if (!movie) {
      throw new CustomException(
        HttpStatus.NOT_FOUND,
        'MOVIE_NOT_FOUND',
        'Không tìm thấy phim',
      );
    }

    // 2. Lookup valid rooms in the cinema
    const rooms = await this.roomRepository.find({
      where: { cinemaId: dto.cinemaId, status: ERoomStatus.ACTIVE },
    });

    if (rooms.length === 0) {
      throw new CustomException(
        HttpStatus.BAD_REQUEST,
        'NO_ROOMS_AVAILABLE',
        'Rạp không có phòng chiếu nào đang hoạt động',
      );
    }

    // Lọc phòng theo định dạng phim
    const validRooms = rooms.filter((room) => {
      if (dto.format === EMovieFormat.IMAX) {
        return room.roomType === ERoomType.IMAX;
      } else {
        // Định dạng 2D/3D -> các phòng STANDARD, COUPLE, VIP
        return room.roomType !== ERoomType.IMAX;
      }
    });

    if (validRooms.length === 0) {
      throw new CustomException(
        HttpStatus.BAD_REQUEST,
        'NO_MATCHING_FORMAT_ROOM',
        'Không có phòng nào trong rạp hỗ trợ định dạng phim này',
      );
    }

    // Ưu tiên primaryRoomId lên đầu danh sách
    if (dto.primaryRoomId) {
      validRooms.sort((a, b) => {
        if (a.id === dto.primaryRoomId) return -1;
        if (b.id === dto.primaryRoomId) return 1;
        return 0;
      });
    }

    // 3. Tính toán vòng lặp ngày & giờ
    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);
    endDate.setHours(23, 59, 59, 999); // Đảm bảo lấy hết ngày cuối

    const createdShowtimes: Showtime[] = [];
    const failedSlots: { date: string; reason: string }[] = [];

    const preShow = dto.preShowMinutes ?? 10;
    const postBuffer = dto.postMovieBufferMinutes ?? 15;

    // Duyệt từng ngày
    for (
      let d = new Date(startDate);
      d <= endDate;
      d.setDate(d.getDate() + 1)
    ) {
      // Duyệt từng khung giờ
      for (const timeSlot of dto.timeSlots) {
        const [hours, minutes] = timeSlot.split(':').map(Number);
        const publicStart = new Date(d);
        publicStart.setHours(hours, minutes, 0, 0);

        // Kiểm tra screeningEndDate của phim
        if (movie.screeningEndDate) {
          const mEndDate = new Date(movie.screeningEndDate);
          mEndDate.setHours(23, 59, 59, 999);
          if (publicStart > mEndDate) {
            failedSlots.push({
              date: publicStart.toLocaleString('vi-VN'),
              reason: 'Vượt quá ngày chiếu phim',
            });
            continue;
          }
        }

        const { movieStartTime, movieEndTime, roomReleaseTime } =
          this.calculateTimeSlots(
            publicStart,
            movie.durationMinutes,
            preShow,
            postBuffer,
          );

        let selectedRoomId: number | null = null;

        // Quét từng phòng để tìm phòng trống
        for (const room of validRooms) {
          const conflicting = await this.checkConflict(
            room.id,
            publicStart,
            roomReleaseTime,
          );
          if (!conflicting) {
            selectedRoomId = room.id;
            break;
          }
        }

        if (selectedRoomId) {
          // Tạo showtime
          const showtime = this.showtimeRepository.create({
            movieId: dto.movieId,
            roomId: selectedRoomId,
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
          createdShowtimes.push(saved);
        } else {
          failedSlots.push({
            date: publicStart.toLocaleString('vi-VN'),
            reason: 'Tất cả các phòng hợp lệ đều kẹt lịch',
          });
        }
      }
    }

    return new ApiResponse(true, 'Hoàn tất Bulk Create lịch chiếu', {
      successCount: createdShowtimes.length,
      failedCount: failedSlots.length,
      createdShowtimes,
      failedSlots,
    });
  }

  async findAll(
    page: number = 1,
    pageSize: number = 10,
  ): Promise<ApiResponse<Showtime[]>> {
    const skip = (page - 1) * pageSize;
    const [showtimes, totalItems] = await this.showtimeRepository.findAndCount({
      skip,
      take: pageSize,
      order: { publicStartTime: 'ASC' },
      relations: ['movie', 'room', 'room.cinema'],
    });
    const totalPages = Math.ceil(totalItems / pageSize);
    const response = new ApiResponse(
      true,
      'Lấy danh sách suất chiếu thành công',
      showtimes,
    );
    response.pagination = {
      page: Number(page),
      pageSize: Number(pageSize),
      totalItems,
      totalPages,
    };
    return response;
  }

  async findOne(id: number): Promise<ApiResponse<any>> {
    const showtime = await this.showtimeRepository.findOne({
      where: { id },
      relations: ['movie', 'room', 'room.seats', 'seatHolds'],
    });

    if (!showtime) {
      throw new CustomException(
        HttpStatus.NOT_FOUND,
        'SHOWTIME_NOT_FOUND',
        'Không tìm thấy suất chiếu',
      );
    }

    if (!showtime.room) {
      throw new CustomException(
        HttpStatus.NOT_FOUND,
        'ROOM_NOT_FOUND',
        'Không tìm thấy phòng chiếu',
      );
    }

    // Ưu tiên trạng thái CONFIRMED > HOLDING
    const holdStatusBySeatId = new Map<number, ESeatHoldStatus>();
    for (const hold of showtime.seatHolds ?? []) {
      if (hold.status === ESeatHoldStatus.RELEASED) continue;

      const current = holdStatusBySeatId.get(hold.seatId);
      if (current === ESeatHoldStatus.CONFIRMED) continue;

      if (
        hold.status === ESeatHoldStatus.CONFIRMED ||
        hold.status === ESeatHoldStatus.HOLDING
      ) {
        holdStatusBySeatId.set(hold.seatId, hold.status);
      }
    }

    const seats = (showtime.room.seats ?? [])
      .sort((a, b) => a.row.localeCompare(b.row) || a.number - b.number)
      .map((seat) => ({
        seatId: seat.id,
        row: seat.row,
        column: seat.number,
        status: this.resolveShowtimeSeatStatus(
          seat.status,
          holdStatusBySeatId.get(seat.id),
        ),
        isCouple: showtime.room.roomType === ERoomType.COUPLE,
      }));

    const roomType = this.toClientRoomType(showtime.room.roomType);

    const responseData = {
      id: showtime.id,
      movieId: showtime.movieId,
      roomId: showtime.roomId,
      publicStartTime: showtime.publicStartTime,
      movieStartTime: showtime.movieStartTime,
      movieEndTime: showtime.movieEndTime,
      roomReleaseTime: showtime.roomReleaseTime,
      preShowMinutes: showtime.preShowMinutes,
      postMovieBufferMinutes: showtime.postMovieBufferMinutes,
      format: showtime.format,
      status: showtime.status,
      createdAt: showtime.createdAt,
      updatedAt: showtime.updatedAt,
      movie: showtime.movie,
      room: {
        id: showtime.room.id,
        cinemaId: showtime.room.cinemaId,
        name: showtime.room.name,
        totalSeats: showtime.room.totalSeats,
        status: showtime.room.status,
        roomType,
        rows: showtime.room.rows,
        columns: showtime.room.columns,
        isCouple: showtime.room.isCouple,
        createdAt: showtime.room.createdAt,
        updatedAt: showtime.room.updatedAt,
        seats,
      },
      // NEW: expose trực tiếp để FE dễ render seat-map
      roomType,
      rows: showtime.room.rows,
      columns: showtime.room.columns,
      seats,
    };

    return new ApiResponse(
      true,
      'Lấy thông tin suất chiếu thành công',
      responseData,
    );
  }

  async update(
    id: number,
    dto: UpdateShowtimeDto,
  ): Promise<ApiResponse<Showtime>> {
    // 1. Tìm showtime hiện tại (kèm movie để lấy durationMinutes)
    const showtime = await this.showtimeRepository.findOne({
      where: { id },
      relations: ['movie'],
    });
    if (!showtime) {
      throw new CustomException(
        HttpStatus.NOT_FOUND,
        'SHOWTIME_NOT_FOUND',
        'Không tìm thấy suất chiếu',
      );
    }

    // 2. Merge các field được gửi lên
    const newPublicStart = dto.publicStartTime
      ? new Date(dto.publicStartTime)
      : new Date(showtime.publicStartTime);
    const newPreShow = dto.preShowMinutes ?? showtime.preShowMinutes;
    const newPostBuffer =
      dto.postMovieBufferMinutes ?? showtime.postMovieBufferMinutes;

    // 3. Tính lại các mốc thời gian
    const { movieStartTime, movieEndTime, roomReleaseTime } =
      this.calculateTimeSlots(
        newPublicStart,
        showtime.movie.durationMinutes,
        newPreShow,
        newPostBuffer,
      );

    // 4. Check trùng lịch (loại trừ chính nó)
    const conflicting = await this.checkConflict(
      showtime.roomId,
      newPublicStart,
      roomReleaseTime,
      id,
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
      throw new CustomException(
        HttpStatus.NOT_FOUND,
        'SHOWTIME_NOT_FOUND',
        'Không tìm thấy suất chiếu',
      );
    }
    await this.showtimeRepository.remove(showtime);
    return new ApiResponse(true, 'Xóa suất chiếu thành công');
  }

  async getByMovieId(movieId: number): Promise<ApiResponse<any>> {
    const now = new Date();
    const twoWeeksLater = new Date();
    twoWeeksLater.setDate(now.getDate() + 14);

    const showtimes = await this.showtimeRepository
      .createQueryBuilder('showtime')
      .leftJoinAndSelect('showtime.room', 'room')
      .leftJoinAndSelect('room.cinema', 'cinema')
      .where('showtime.movieId = :movieId', { movieId })
      .andWhere('showtime.status IN (:...statuses)', {
        statuses: [EShowtimeStatus.SCHEDULED, EShowtimeStatus.ACTIVE],
      })
      .andWhere('showtime.publicStartTime > :now', { now })
      .andWhere('showtime.publicStartTime <= :twoWeeksLater', { twoWeeksLater })
      .orderBy('showtime.publicStartTime', 'ASC')
      .getMany();

    // Nhóm theo ngày
    const grouped = this.groupByDate(showtimes);
    return new ApiResponse(
      true,
      'Lấy suất chiếu theo phim thành công',
      grouped,
    );
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

  //Chuẩn roomType về lowercase đúng contract FE
  private toClientRoomType(
    roomType: ERoomType,
  ): 'standard' | 'vip' | 'imax' | 'couple' {
    return roomType.toLowerCase() as 'standard' | 'vip' | 'imax' | 'couple';
  }

  //Map trạng thái ghế theo seat_holds + seat status
  private resolveShowtimeSeatStatus(
    seatStatus: ESeatStatus,
    holdStatus?: ESeatHoldStatus,
  ): 'available' | 'booked' | 'selected' {
    if (seatStatus === ESeatStatus.MAINTENANCE) return 'booked';
    if (holdStatus === ESeatHoldStatus.CONFIRMED) return 'booked';
    if (holdStatus === ESeatHoldStatus.HOLDING) return 'selected';
    return 'available';
  }

  private groupByDate(showtimes: Showtime[]): Record<string, Showtime[]> {
    const grouped: Record<string, Showtime[]> = {};
    for (const showtime of showtimes) {
      const dateKey = new Date(showtime.publicStartTime)
        .toISOString()
        .split('T')[0];
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(showtime);
    }
    return grouped;
  }
}
