import { Injectable, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cinema } from './entities/cinema.entity';
import { Room } from './entities/room.entity';
import { Seat } from './entities/seat.entity';
import { RoomTypeConfig } from './entities/room-type-config.entity';
import {
  CreateCinemaDto,
  UpdateCinemaDto,
  GetCinemasQueryDto,
} from './dto/cinema.dto';
import { CreateRoomDto, UpdateRoomDto } from './dto/room.dto';
import { GenerateSeatsDto } from './dto/seat.dto';
import { ApiResponse } from '../../core/dto/ApiResponse.dto';
import { CustomException } from '../../core/exceptions/custom.exception';
import {
  ECinemaStatus,
  ERoomStatus,
  ERoomType,
  ESeatStatus,
} from './enums/cinema.enum';

type ClientRoomType = 'standard' | 'vip' | 'imax' | 'couple';
type ClientSeatStatus = 'available' | 'booked' | 'selected';

@Injectable()
export class CinemaService {
  constructor(
    @InjectRepository(Cinema)
    private readonly cinemaRepository: Repository<Cinema>,
    @InjectRepository(Room)
    private readonly roomRepository: Repository<Room>,
    @InjectRepository(Seat)
    private readonly seatRepository: Repository<Seat>,
    @InjectRepository(RoomTypeConfig)
    private readonly roomTypeConfigRepository: Repository<RoomTypeConfig>,
  ) {}

  // NEW: chuẩn hóa roomType trả về cho FE theo lowercase
  private toClientRoomType(roomType: ERoomType): ClientRoomType {
    return roomType.toLowerCase() as ClientRoomType;
  }

  // NEW: map seat status cho API room detail
  private mapRoomSeatStatus(seat: Seat): Exclude<ClientSeatStatus, 'selected'> {
    if (seat.status === ESeatStatus.MAINTENANCE) {
      return 'booked';
    }
    return 'available';
  }

  // NEW: luôn đọc cấu hình ghế cố định theo roomType
  private async getRoomTypeConfigOrThrow(
    roomType: ERoomType,
  ): Promise<RoomTypeConfig> {
    const config = await this.roomTypeConfigRepository.findOne({
      where: { roomType },
    });

    if (!config) {
      throw new CustomException(
        HttpStatus.BAD_REQUEST,
        'ROOM_TYPE_CONFIG_NOT_FOUND',
        `Chua cau hinh ghe cho loai phong ${roomType}`,
      );
    }

    return config;
  }

  // NEW: tạo lại toàn bộ seat theo rows/columns đã cố định của room
  private async generateSeatsByFixedConfig(room: Room): Promise<Seat[]> {
    await this.seatRepository.delete({ roomId: room.id });

    const seats: Seat[] = [];
    for (let r = 0; r < room.rows; r++) {
      const rowLabel = String.fromCharCode(65 + r); // A, B, C...
      for (let c = 1; c <= room.columns; c++) {
        const seat = this.seatRepository.create({
          roomId: room.id,
          row: rowLabel,
          number: c,
          label: `${rowLabel}${c}`,
          status: ESeatStatus.EMPTY,
        });
        seats.push(seat);
      }
    }

    const savedSeats = await this.seatRepository.save(seats);

    if (room.totalSeats !== savedSeats.length) {
      room.totalSeats = savedSeats.length;
      await this.roomRepository.save(room);
    }

    return savedSeats;
  }

  // —— CINEMA CRUD ——————————————————————————————————————————————

  async createCinema(dto: CreateCinemaDto): Promise<ApiResponse<Cinema>> {
    const normalizedName = dto.name.trim();
    const existing = await this.cinemaRepository
      .createQueryBuilder('cinema')
      .where('LOWER(cinema.name) = LOWER(:name)', { name: normalizedName })
      .getOne();
    if (existing) {
      throw new CustomException(
        HttpStatus.BAD_REQUEST,
        'CINEMA_NAME_EXISTS',
        'Ten rap da ton tai',
      );
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
    return new ApiResponse(true, 'Tao rap chieu phim thanh cong', saved);
  }

  async getAllCinemas(
    query: GetCinemasQueryDto,
  ): Promise<ApiResponse<Cinema[]>> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    const skip = (page - 1) * pageSize;
    const builder = this.cinemaRepository.createQueryBuilder('cinema');

    if (query.name) {
      builder.andWhere('LOWER(cinema.name) LIKE :name', {
        name: `%${query.name.toLowerCase()}%`,
      });
    }
    if (query.address) {
      builder.andWhere('LOWER(cinema.address) LIKE :address', {
        address: `%${query.address.toLowerCase()}%`,
      });
    }
    if (query.phone) {
      builder.andWhere('cinema.phone LIKE :phone', {
        phone: `%${query.phone}%`,
      });
    }
    if (query.email) {
      builder.andWhere('LOWER(cinema.email) LIKE :email', {
        email: `%${query.email.toLowerCase()}%`,
      });
    }

    const [cinemas, totalItems] = await builder
      .orderBy('cinema.id', 'DESC')
      .skip(skip)
      .take(pageSize)
      .getManyAndCount();

    const totalPages = Math.ceil(totalItems / pageSize);
    const response = new ApiResponse(
      true,
      'Lay danh sach rap thanh cong',
      cinemas,
    );
    response.pagination = {
      page: Number(page),
      pageSize: Number(pageSize),
      totalItems,
      totalPages,
    };
    return response;
  }

  async getCinemaById(id: number): Promise<ApiResponse<Cinema>> {
    const cinema = await this.cinemaRepository.findOne({
      where: { id },
      relations: ['rooms'],
    });
    if (!cinema) {
      throw new CustomException(
        HttpStatus.NOT_FOUND,
        'CINEMA_NOT_FOUND',
        'Khong tim thay rap chieu phim',
      );
    }
    return new ApiResponse(true, 'Lay thong tin rap thanh cong', cinema);
  }

  async updateCinema(
    id: number,
    dto: UpdateCinemaDto,
  ): Promise<ApiResponse<Cinema>> {
    const cinema = await this.cinemaRepository.findOne({ where: { id } });
    if (!cinema) {
      throw new CustomException(
        HttpStatus.NOT_FOUND,
        'CINEMA_NOT_FOUND',
        'Khong tim thay rap chieu phim',
      );
    }

    if (dto.name) {
      const normalizedName = dto.name.trim();
      const existing = await this.cinemaRepository
        .createQueryBuilder('cinema')
        .where('LOWER(cinema.name) = LOWER(:name)', { name: normalizedName })
        .andWhere('cinema.id != :id', { id })
        .getOne();
      if (existing) {
        throw new CustomException(
          HttpStatus.BAD_REQUEST,
          'CINEMA_NAME_EXISTS',
          'Ten rap da ton tai',
        );
      }
      cinema.name = normalizedName;
    }

    if (dto.address) cinema.address = dto.address.trim();
    if (dto.phone !== undefined) cinema.phone = dto.phone?.trim();
    if (dto.email !== undefined) cinema.email = dto.email?.trim();
    if (dto.status !== undefined) cinema.status = dto.status;

    const updated = await this.cinemaRepository.save(cinema);
    return new ApiResponse(true, 'Cap nhat rap thanh cong', updated);
  }

  async deleteCinema(id: number): Promise<ApiResponse<null>> {
    const cinema = await this.cinemaRepository.findOne({ where: { id } });
    if (!cinema) {
      throw new CustomException(
        HttpStatus.NOT_FOUND,
        'CINEMA_NOT_FOUND',
        'Khong tim thay rap chieu phim',
      );
    }
    await this.cinemaRepository.remove(cinema);
    return new ApiResponse(true, 'Xoa rap thanh cong');
  }

  // —— ROOM CRUD ——————————————————————————————————————————————

  async createRoom(
    cinemaId: number,
    dto: CreateRoomDto,
  ): Promise<ApiResponse<Room>> {
    const cinema = await this.cinemaRepository.findOne({
      where: { id: cinemaId },
    });
    if (!cinema) {
      throw new CustomException(
        HttpStatus.NOT_FOUND,
        'CINEMA_NOT_FOUND',
        'Khong tim thay rap chieu phim',
      );
    }

    // NEW: lấy cấu hình cứng theo roomType, không nhận totalSeats từ client
    const roomTypeConfig = await this.getRoomTypeConfigOrThrow(dto.roomType);

    const room = this.roomRepository.create({
      cinemaId,
      name: dto.name.trim(),
      roomType: dto.roomType,
      status: dto.status ?? ERoomStatus.ACTIVE,
      rows: roomTypeConfig.rows,
      columns: roomTypeConfig.columns,
      totalSeats: roomTypeConfig.totalSeats,
      isCouple: roomTypeConfig.isCouple,
    });

    const saved = await this.roomRepository.save(room);

    // NEW: tự generate ghế ngay sau khi tạo phòng
    await this.generateSeatsByFixedConfig(saved);

    return new ApiResponse(true, 'Tao phong chieu thanh cong', saved);
  }

  async getRoomsByCinemaId(cinemaId: number): Promise<ApiResponse<Room[]>> {
    const cinema = await this.cinemaRepository.findOne({
      where: { id: cinemaId },
    });
    if (!cinema) {
      throw new CustomException(
        HttpStatus.NOT_FOUND,
        'CINEMA_NOT_FOUND',
        'Khong tim thay rap chieu phim',
      );
    }
    const rooms = await this.roomRepository.find({
      where: { cinemaId },
      order: { id: 'ASC' },
    });
    return new ApiResponse(true, 'Lay danh sach phong chieu thanh cong', rooms);
  }

  async getRoomById(roomId: number): Promise<ApiResponse<any>> {
    const room = await this.roomRepository.findOne({
      where: { id: roomId },
      relations: ['cinema', 'seats'],
    });
    if (!room) {
      throw new CustomException(
        HttpStatus.NOT_FOUND,
        'ROOM_NOT_FOUND',
        'Khong tim thay phong chieu',
      );
    }

    // NEW: format dữ liệu đúng contract FE yêu cầu
    const seats = (room.seats ?? [])
      .sort((a, b) => a.row.localeCompare(b.row) || a.number - b.number)
      .map((seat) => ({
        seatId: seat.id,
        row: seat.row,
        column: seat.number,
        status: this.mapRoomSeatStatus(seat),
        isCouple: room.isCouple,
      }));

    const responseData = {
      ...room,
      roomType: this.toClientRoomType(room.roomType),
      rows: room.rows,
      columns: room.columns,
      seats,
    };

    return new ApiResponse(
      true,
      'Lay thong tin phong chieu thanh cong',
      responseData,
    );
  }

  async updateRoom(
    roomId: number,
    dto: UpdateRoomDto,
  ): Promise<ApiResponse<Room>> {
    const room = await this.roomRepository.findOne({ where: { id: roomId } });
    if (!room) {
      throw new CustomException(
        HttpStatus.NOT_FOUND,
        'ROOM_NOT_FOUND',
        'Khong tim thay phong chieu',
      );
    }

    if (dto.name !== undefined) room.name = dto.name.trim();
    if (dto.status !== undefined) room.status = dto.status;

    let needRegenerateSeats = false;

    // NEW: nếu đổi roomType thì cập nhật lại cấu hình cố định
    if (dto.roomType && dto.roomType !== room.roomType) {
      const config = await this.getRoomTypeConfigOrThrow(dto.roomType);
      room.roomType = dto.roomType;
      room.rows = config.rows;
      room.columns = config.columns;
      room.totalSeats = config.totalSeats;
      room.isCouple = config.isCouple;
      needRegenerateSeats = true;
    }

    const updated = await this.roomRepository.save(room);

    // NEW: regenerate seat layout theo roomType mới
    if (needRegenerateSeats) {
      await this.generateSeatsByFixedConfig(updated);
    }

    return new ApiResponse(true, 'Cap nhat phong chieu thanh cong', updated);
  }

  async deleteRoom(roomId: number): Promise<ApiResponse<null>> {
    const room = await this.roomRepository.findOne({ where: { id: roomId } });
    if (!room) {
      throw new CustomException(
        HttpStatus.NOT_FOUND,
        'ROOM_NOT_FOUND',
        'Khong tim thay phong chieu',
      );
    }
    await this.roomRepository.remove(room);
    return new ApiResponse(true, 'Xoa phong chieu thanh cong');
  }

  // —— SEAT OPERATIONS —————————————————————————————————————————

  async generateSeats(
    roomId: number,
    _dto: GenerateSeatsDto,
  ): Promise<ApiResponse<Seat[]>> {
    const room = await this.roomRepository.findOne({ where: { id: roomId } });
    if (!room) {
      throw new CustomException(
        HttpStatus.NOT_FOUND,
        'ROOM_NOT_FOUND',
        'Khong tim thay phong chieu',
      );
    }

    // NEW: luôn ép layout theo roomType config, bỏ qua input rows/columns của client
    if (!room.rows || !room.columns) {
      const config = await this.getRoomTypeConfigOrThrow(room.roomType);
      room.rows = config.rows;
      room.columns = config.columns;
      room.totalSeats = config.totalSeats;
      room.isCouple = config.isCouple;
      await this.roomRepository.save(room);
    }

    const savedSeats = await this.generateSeatsByFixedConfig(room);
    return new ApiResponse(
      true,
      `Tao ${savedSeats.length} ghe thanh cong`,
      savedSeats,
    );
  }

  async getSeatsByRoomId(roomId: number): Promise<ApiResponse<Seat[]>> {
    const room = await this.roomRepository.findOne({ where: { id: roomId } });
    if (!room) {
      throw new CustomException(
        HttpStatus.NOT_FOUND,
        'ROOM_NOT_FOUND',
        'Khong tim thay phong chieu',
      );
    }
    const seats = await this.seatRepository.find({
      where: { roomId },
      order: { row: 'ASC', number: 'ASC' },
    });
    return new ApiResponse(true, 'Lay danh sach ghe thanh cong', seats);
  }
}
