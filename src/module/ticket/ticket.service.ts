import { Injectable, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TicketPrice } from './entities/ticket-price.entity';
import { Ticket } from './entities/ticket.entity';
import { CreateTicketPriceDto, UpdateTicketPriceDto, BulkCreateTicketPriceDto } from './dto/ticket-price.dto';
import { ApiResponse } from '../../core/dto/ApiResponse.dto';
import { CustomException } from '../../core/exceptions/custom.exception';
import { Seat } from '../cinema/entities/seat.entity';
import { Booking } from '../booking/entities/booking.entity';
import { SeatHold } from '../booking/entities/seat-hold.entity';
import { ETicketStatus } from './enums/ticket.enum';
import { ESeatHoldStatus } from '../booking/enums/booking.enum';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class TicketService {
  constructor(
    @InjectRepository(TicketPrice)
    private readonly ticketPriceRepository: Repository<TicketPrice>,
    @InjectRepository(Ticket)
    private readonly ticketRepository: Repository<Ticket>,
    @InjectRepository(Seat)
    private readonly seatRepository: Repository<Seat>,
    @InjectRepository(SeatHold)
    private readonly seatHoldRepository: Repository<SeatHold>,
    private readonly redisService: RedisService,
  ) {}

  // ─── TICKET PRICE ─────────────────────────────────────────────────────

  async createTicketPrice(dto: CreateTicketPriceDto): Promise<ApiResponse<TicketPrice>> {
    const existing = await this.ticketPriceRepository.findOne({
      where: {
        showtimeId: dto.showtimeId,
        seatType: dto.seatType,
        dayType: dto.dayType,
      },
    });
    if (existing) {
      throw new CustomException(
        HttpStatus.BAD_REQUEST,
        'TICKET_PRICE_EXISTS',
        'Giá vé cho loại ghế và ngày này đã tồn tại',
      );
    }

    const ticketPrice = this.ticketPriceRepository.create(dto);
    const saved = await this.ticketPriceRepository.save(ticketPrice);
    return new ApiResponse(true, 'Tạo giá vé thành công', saved);
  }

  async bulkCreateTicketPrices(dto: BulkCreateTicketPriceDto): Promise<ApiResponse<TicketPrice[]>> {
    const ticketPrices: TicketPrice[] = [];
    for (const item of dto.prices) {
      const existing = await this.ticketPriceRepository.findOne({
        where: {
          showtimeId: dto.showtimeId,
          seatType: item.seatType,
          dayType: item.dayType,
        },
      });
      if (existing) {
        // Cập nhật giá nếu đã tồn tại
        existing.price = item.price;
        ticketPrices.push(existing);
      } else {
        const ticketPrice = this.ticketPriceRepository.create({
          showtimeId: dto.showtimeId,
          seatType: item.seatType,
          dayType: item.dayType,
          price: item.price,
        });
        ticketPrices.push(ticketPrice);
      }
    }
    const saved = await this.ticketPriceRepository.save(ticketPrices);
    return new ApiResponse(true, 'Cấu hình giá vé thành công', saved);
  }

  async getTicketPricesByShowtimeId(showtimeId: number): Promise<ApiResponse<TicketPrice[]>> {
    const prices = await this.ticketPriceRepository.find({
      where: { showtimeId },
      order: { seatType: 'ASC', dayType: 'ASC' },
    });
    return new ApiResponse(true, 'Lấy danh sách giá vé thành công', prices);
  }

  async updateTicketPrice(id: number, dto: UpdateTicketPriceDto): Promise<ApiResponse<TicketPrice>> {
    const ticketPrice = await this.ticketPriceRepository.findOne({ where: { id } });
    if (!ticketPrice) {
      throw new CustomException(HttpStatus.NOT_FOUND, 'TICKET_PRICE_NOT_FOUND', 'Không tìm thấy giá vé');
    }
    Object.assign(ticketPrice, dto);
    const updated = await this.ticketPriceRepository.save(ticketPrice);
    return new ApiResponse(true, 'Cập nhật giá vé thành công', updated);
  }

  async deleteTicketPrice(id: number): Promise<ApiResponse<null>> {
    const ticketPrice = await this.ticketPriceRepository.findOne({ where: { id } });
    if (!ticketPrice) {
      throw new CustomException(HttpStatus.NOT_FOUND, 'TICKET_PRICE_NOT_FOUND', 'Không tìm thấy giá vé');
    }
    await this.ticketPriceRepository.remove(ticketPrice);
    return new ApiResponse(true, 'Xóa giá vé thành công');
  }

  // ─── TICKET GENERATION (called from PaymentService) ───────────────────

  async generateTicketsForBooking(booking: Booking): Promise<Ticket[]> {
    const seatHolds = await this.seatHoldRepository.find({
      where: { bookingId: booking.id, status: ESeatHoldStatus.CONFIRMED },
      relations: ['seat'],
    });

    const tickets: Ticket[] = [];
    for (const hold of seatHolds) {
      const seat = hold.seat;

      // Xác định dayType dựa trên ngày suất chiếu
      const showtimeDate = new Date(booking.showtime?.publicStartTime || new Date());
      const dayOfWeek = showtimeDate.getDay();
      const dayType = (dayOfWeek === 0 || dayOfWeek === 6) ? 'WEEKEND' : 'WEEKDAY';

      // Tìm giá vé tương ứng
      const ticketPrice = await this.ticketPriceRepository.findOne({
        where: {
          showtimeId: booking.showtimeId,
          seatType: seat.seatType,
          dayType: dayType as any,
        },
      });

      const qrCode = this.generateQRCode();

      const ticket = this.ticketRepository.create({
        bookingId: booking.id,
        seatId: seat.id,
        showtimeId: booking.showtimeId,
        ticketPriceId: ticketPrice?.id || 0,
        price: ticketPrice?.price || 0,
        qrCode,
        status: ETicketStatus.ACTIVE,
        isCheckedIn: false,
      });
      tickets.push(ticket);
    }

    const savedTickets = await this.ticketRepository.save(tickets);

    // Release ghế trong Redis
    const seatIds = seatHolds.map(h => h.seatId);
    await this.redisService.releaseSeats(booking.showtimeId, seatIds);

    return savedTickets;
  }

  private generateQRCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = 'TKT-';
    for (let i = 0; i < 16; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
}
