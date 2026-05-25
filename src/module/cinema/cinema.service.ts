import { Injectable, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cinema } from './entities/cinema.entity';
import { Room } from './entities/room.entity';
import { Seat } from './entities/seat.entity';
import { CreateCinemaDto, UpdateCinemaDto, GetCinemasQueryDto } from './dto/cinema.dto';
import { CreateRoomDto, UpdateRoomDto } from './dto/room.dto';
import { GenerateSeatsDto } from './dto/seat.dto';
import { ApiResponse } from '../../core/dto/ApiResponse.dto';
import { CustomException } from '../../core/exceptions/custom.exception';
import { ECinemaStatus, ESeatStatus } from './enums/cinema.enum';

@Injectable()
export class CinemaService {
  constructor(
    @InjectRepository(Cinema)
    private readonly cinemaRepository: Repository<Cinema>,
    @InjectRepository(Room)
    private readonly roomRepository: Repository<Room>,
    @InjectRepository(Seat)
    private readonly seatRepository: Repository<Seat>,
  ) {}

  // ─── CINEMA CRUD ──────────────────────────────────────────────────────

  async createCinema(dto: CreateCinemaDto): Promise<ApiResponse<Cinema>> {
    const normalizedName = dto.name.trim();
    const existing = await this.cinemaRepository
      .createQueryBuilder('cinema')
      .where('LOWER(cinema.name) = LOWER(:name)', { name: normalizedName })
      .getOne();
    if (existing) {
      throw new CustomException(HttpStatus.BAD_REQUEST, 'CINEMA_NAME_EXISTS', 'Tên rạp đã tồn tại');
    }

    const cinema = this.cinemaRepository.create({
      ...dto,
      name: normalizedName,
      address: dto.address.trim(),
      phone: dto.phone?.trim(),
      email: dto.email?.trim(),
      status: dto.status || ECinemaStatus.ACTIVE,
    });
    const saved = await this.cinemaRepository.save(cinema);
    return new ApiResponse(true, 'Tạo rạp chiếu phim thành công', saved);
  }

  async getAllCinemas(query: GetCinemasQueryDto): Promise<ApiResponse<Cinema[]>> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    const skip = (page - 1) * pageSize;
    const builder = this.cinemaRepository.createQueryBuilder('cinema');

    if (query.name) {
      builder.andWhere('LOWER(cinema.name) LIKE :name', { name: `%${query.name.toLowerCase()}%` });
    }
    if (query.address) {
      builder.andWhere('LOWER(cinema.address) LIKE :address', { address: `%${query.address.toLowerCase()}%` });
    }
    if (query.phone) {
      builder.andWhere('cinema.phone LIKE :phone', { phone: `%${query.phone}%` });
    }
    if (query.email) {
      builder.andWhere('LOWER(cinema.email) LIKE :email', { email: `%${query.email.toLowerCase()}%` });
    }

    const [cinemas, totalItems] = await builder
      .orderBy('cinema.id', 'DESC')
      .skip(skip)
      .take(pageSize)
      .getManyAndCount();

    const totalPages = Math.ceil(totalItems / pageSize);
    const response = new ApiResponse(true, 'Lấy danh sách rạp thành công', cinemas);
    response.pagination = { page: Number(page), pageSize: Number(pageSize), totalItems, totalPages };
    return response;
  }

  async getCinemaById(id: number): Promise<ApiResponse<Cinema>> {
    const cinema = await this.cinemaRepository.findOne({
      where: { id },
      relations: ['rooms'],
    });
    if (!cinema) {
      throw new CustomException(HttpStatus.NOT_FOUND, 'CINEMA_NOT_FOUND', 'Không tìm thấy rạp chiếu phim');
    }
    return new ApiResponse(true, 'Lấy thông tin rạp thành công', cinema);
  }

  async updateCinema(id: number, dto: UpdateCinemaDto): Promise<ApiResponse<Cinema>> {
    const cinema = await this.cinemaRepository.findOne({ where: { id } });
    if (!cinema) {
      throw new CustomException(HttpStatus.NOT_FOUND, 'CINEMA_NOT_FOUND', 'Không tìm thấy rạp chiếu phim');
    }

    if (dto.name) {
      const normalizedName = dto.name.trim();
      const existing = await this.cinemaRepository
        .createQueryBuilder('cinema')
        .where('LOWER(cinema.name) = LOWER(:name)', { name: normalizedName })
        .andWhere('cinema.id != :id', { id })
        .getOne();
      if (existing) {
        throw new CustomException(HttpStatus.BAD_REQUEST, 'CINEMA_NAME_EXISTS', 'Tên rạp đã tồn tại');
      }
      cinema.name = normalizedName;
    }

    if (dto.address) cinema.address = dto.address.trim();
    if (dto.phone !== undefined) cinema.phone = dto.phone?.trim();
    if (dto.email !== undefined) cinema.email = dto.email?.trim();
    if (dto.status !== undefined) cinema.status = dto.status;

    const updated = await this.cinemaRepository.save(cinema);
    return new ApiResponse(true, 'Cập nhật rạp thành công', updated);
  }

  async deleteCinema(id: number): Promise<ApiResponse<null>> {
    const cinema = await this.cinemaRepository.findOne({ where: { id } });
    if (!cinema) {
      throw new CustomException(HttpStatus.NOT_FOUND, 'CINEMA_NOT_FOUND', 'Không tìm thấy rạp chiếu phim');
    }
    await this.cinemaRepository.remove(cinema);
    return new ApiResponse(true, 'Xóa rạp thành công');
  }

  // ─── ROOM CRUD ────────────────────────────────────────────────────────

  async createRoom(cinemaId: number, dto: CreateRoomDto): Promise<ApiResponse<Room>> {
    const cinema = await this.cinemaRepository.findOne({ where: { id: cinemaId } });
    if (!cinema) {
      throw new CustomException(HttpStatus.NOT_FOUND, 'CINEMA_NOT_FOUND', 'Không tìm thấy rạp chiếu phim');
    }
    const room = this.roomRepository.create({
      ...dto,
      cinemaId,
    });
    const saved = await this.roomRepository.save(room);
    return new ApiResponse(true, 'Tạo phòng chiếu thành công', saved);
  }

  async getRoomsByCinemaId(cinemaId: number): Promise<ApiResponse<Room[]>> {
    const cinema = await this.cinemaRepository.findOne({ where: { id: cinemaId } });
    if (!cinema) {
      throw new CustomException(HttpStatus.NOT_FOUND, 'CINEMA_NOT_FOUND', 'Không tìm thấy rạp chiếu phim');
    }
    const rooms = await this.roomRepository.find({
      where: { cinemaId },
      order: { id: 'ASC' },
    });
    return new ApiResponse(true, 'Lấy danh sách phòng chiếu thành công', rooms);
  }

  async getRoomById(roomId: number): Promise<ApiResponse<Room>> {
    const room = await this.roomRepository.findOne({
      where: { id: roomId },
      relations: ['cinema', 'seats'],
    });
    if (!room) {
      throw new CustomException(HttpStatus.NOT_FOUND, 'ROOM_NOT_FOUND', 'Không tìm thấy phòng chiếu');
    }
    return new ApiResponse(true, 'Lấy thông tin phòng chiếu thành công', room);
  }

  async updateRoom(roomId: number, dto: UpdateRoomDto): Promise<ApiResponse<Room>> {
    const room = await this.roomRepository.findOne({ where: { id: roomId } });
    if (!room) {
      throw new CustomException(HttpStatus.NOT_FOUND, 'ROOM_NOT_FOUND', 'Không tìm thấy phòng chiếu');
    }
    Object.assign(room, dto);
    const updated = await this.roomRepository.save(room);
    return new ApiResponse(true, 'Cập nhật phòng chiếu thành công', updated);
  }

  async deleteRoom(roomId: number): Promise<ApiResponse<null>> {
    const room = await this.roomRepository.findOne({ where: { id: roomId } });
    if (!room) {
      throw new CustomException(HttpStatus.NOT_FOUND, 'ROOM_NOT_FOUND', 'Không tìm thấy phòng chiếu');
    }
    await this.roomRepository.remove(room);
    return new ApiResponse(true, 'Xóa phòng chiếu thành công');
  }

  // ─── SEAT OPERATIONS ──────────────────────────────────────────────────
  async generateSeats(roomId: number, dto: GenerateSeatsDto): Promise<ApiResponse<Seat[]>> {
    const room = await this.roomRepository.findOne({ where: { id: roomId } });
    if (!room) {
      throw new CustomException(HttpStatus.NOT_FOUND, 'ROOM_NOT_FOUND', 'Không tìm thấy phòng chiếu');
    }

    // Xóa ghế cũ nếu có
    await this.seatRepository.delete({ roomId });

    const seats: Seat[] = [];

    for (let r = 0; r < dto.rows; r++) {
      const rowLabel = String.fromCharCode(65 + r); // A, B, C, ...
      for (let c = 1; c <= dto.columns; c++) {
        const seat = this.seatRepository.create({
          roomId,
          row: rowLabel,
          number: c,
          label: `${rowLabel}${c}`,
          status: ESeatStatus.EMPTY,
        });
        seats.push(seat);
      }
    }

    const savedSeats = await this.seatRepository.save(seats);

    // Cập nhật tổng số ghế của phòng
    room.totalSeats = savedSeats.length;
    await this.roomRepository.save(room);

    return new ApiResponse(true, `Tạo ${savedSeats.length} ghế thành công`, savedSeats);
  }

  async getSeatsByRoomId(roomId: number): Promise<ApiResponse<Seat[]>> {
    const room = await this.roomRepository.findOne({ where: { id: roomId } });
    if (!room) {
      throw new CustomException(HttpStatus.NOT_FOUND, 'ROOM_NOT_FOUND', 'Không tìm thấy phòng chiếu');
    }
    const seats = await this.seatRepository.find({
      where: { roomId },
      order: { row: 'ASC', number: 'ASC' },
    });
    return new ApiResponse(true, 'Lấy danh sách ghế thành công', seats);
  }


}
