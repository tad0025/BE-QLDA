import { Injectable, HttpStatus, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Booking } from './entities/booking.entity';
import { BookingConcession } from './entities/booking-concession.entity';
import { SeatHold } from './entities/seat-hold.entity';
import { HoldSeatsDto, CreateBookingDto } from './dto/booking.dto';
import { ApiResponse } from '../../core/dto/ApiResponse.dto';
import { CustomException } from '../../core/exceptions/custom.exception';
import { RedisService } from '../redis/redis.service';
import { EBookingStatus, EBookingSource, ESeatHoldStatus } from './enums/booking.enum';
import { Seat } from '../cinema/entities/seat.entity';
import { TicketPrice } from '../ticket/entities/ticket-price.entity';
import { ConcessionProduct } from '../concession/entities/concession-product.entity';
import { Promotion } from '../promotion/entities/promotion.entity';
import { EDiscountType } from '../promotion/enums/promotion.enum';
import { Showtime } from '../showtime/entities/showtime.entity';
import { SeatGateway } from './seat.gateway';

@Injectable()
export class BookingService {
  constructor(
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
    @InjectRepository(BookingConcession)
    private readonly bookingConcessionRepository: Repository<BookingConcession>,
    @InjectRepository(SeatHold)
    private readonly seatHoldRepository: Repository<SeatHold>,
    @InjectRepository(Seat)
    private readonly seatRepository: Repository<Seat>,
    @InjectRepository(TicketPrice)
    private readonly ticketPriceRepository: Repository<TicketPrice>,
    @InjectRepository(Showtime)
    private readonly showtimeRepository: Repository<Showtime>,
    @InjectRepository(ConcessionProduct)
    private readonly concessionProductRepository: Repository<ConcessionProduct>,
    @InjectRepository(Promotion)
    private readonly promotionRepository: Repository<Promotion>,
    private readonly redisService: RedisService,
    @Optional() private readonly seatGateway: SeatGateway,
  ) {}

  // ─── SEAT HOLD ────────────────────────────────────────────────────────

  async holdSeats(userId: number, dto: HoldSeatsDto): Promise<ApiResponse<any>> {
    // Kiểm tra showtime còn có thể đặt vé không
    const showtime = await this.showtimeRepository.findOne({ where: { id: dto.showtimeId } });
    if (!showtime) {
      throw new CustomException(HttpStatus.NOT_FOUND, 'SHOWTIME_NOT_FOUND', 'Không tìm thấy suất chiếu');
    }
    if (showtime.status === 'COMPLETED' || showtime.status === 'CANCELLED') {
      throw new CustomException(
        HttpStatus.BAD_REQUEST,
        'SHOWTIME_NOT_BOOKABLE',
        'Suất chiếu này đã kết thúc hoặc bị huỷ, không thể đặt vé',
      );
    }

    const failedSeats: number[] = [];
    const successSeats: number[] = [];

    for (const seatId of dto.seatIds) {
      const success = await this.redisService.holdSeat(dto.showtimeId, seatId, userId, 300);
      if (!success) {
        failedSeats.push(seatId);
      } else {
        successSeats.push(seatId);
      }
    }

    if (failedSeats.length > 0) {
      await this.redisService.releaseSeats(dto.showtimeId, successSeats);
      throw new CustomException(
        HttpStatus.BAD_REQUEST,
        'SEAT_ALREADY_HELD',
        `Ghế ${failedSeats.join(', ')} đã bị giữ bởi người khác`,
      );
    }

    const now = new Date();
    const expiredAt = new Date(now.getTime() + 5 * 60 * 1000);

    for (const seatId of dto.seatIds) {
      await this.seatHoldRepository.delete({
        showtimeId: dto.showtimeId,
        seatId,
      });

      const seatHold = this.seatHoldRepository.create({
        showtimeId: dto.showtimeId,
        seatId,
        userId,
        heldAt: now,
        expiredAt,
        status: ESeatHoldStatus.HOLDING,
      });
      await this.seatHoldRepository.save(seatHold);
    }

    // Emit seat-update realtime cho tất cả client đang xem suất chiếu này
    await this.broadcastSeatUpdate(dto.showtimeId);

    return new ApiResponse(true, 'Giữ ghế thành công (5 phút)', {
      showtimeId: dto.showtimeId,
      seatIds: dto.seatIds,
      expiredAt,
    });
  }

  // ─── CREATE BOOKING ───────────────────────────────────────────────────

  async createBooking(userId: number, dto: CreateBookingDto): Promise<ApiResponse<Booking>> {
    // Verify tất cả ghế đang được hold bởi user này
    for (const seatId of dto.seatIds) {
      const holder = await this.redisService.getSeatHolder(dto.showtimeId, seatId);
      if (holder !== userId) {
        throw new CustomException(
          HttpStatus.BAD_REQUEST,
          'SEAT_NOT_HELD',
          `Ghế ${seatId} chưa được giữ hoặc đã hết hạn`,
        );
      }
    }

    // Lấy thông tin ghế
    const seats = await this.seatRepository.find({
      where: { id: In(dto.seatIds) },
      relations: ['room'],
    });

    // Xác định dayType
    const showtime = await this.showtimeRepository.findOne({ where: { id: dto.showtimeId } });
    if (!showtime) {
      throw new CustomException(HttpStatus.NOT_FOUND, 'SHOWTIME_NOT_FOUND', 'Không tìm thấy suất chiếu');
    }
    if (showtime.status === 'COMPLETED' || showtime.status === 'CANCELLED') {
      throw new CustomException(
        HttpStatus.BAD_REQUEST,
        'SHOWTIME_NOT_BOOKABLE',
        'Suất chiếu này đã kết thúc hoặc bị huỷ, không thể đặt vé',
      );
    }

    const now = new Date();
    const dayOfWeek = new Date(showtime.publicStartTime).getDay();
    const dayType = (dayOfWeek === 0 || dayOfWeek === 6) ? 'WEEKEND' : 'WEEKDAY';

    // Tính tổng tiền vé
    let ticketTotal = 0;
    for (const seat of seats) {
      const ticketPrice = await this.ticketPriceRepository.findOne({
        where: {
          roomType: seat.room?.roomType,
          dayType: dayType as any,
        },
      });
      if (!ticketPrice) {
        throw new CustomException(
          HttpStatus.BAD_REQUEST,
          'TICKET_PRICE_NOT_FOUND',
          'Chua cau hinh gia ve cho loai phong va ngay nay',
        );
      }
      ticketTotal += ticketPrice.price;
    }

    // Tính tổng tiền bắp nước
    let concessionTotal = 0;
    const concessionItems: { productId: number; quantity: number; unitPrice: number; subtotal: number }[] = [];

    if (dto.concessions && dto.concessions.length > 0) {
      for (const item of dto.concessions) {
        const product = await this.concessionProductRepository.findOne({
          where: { id: item.productId },
        });
        if (!product) {
          throw new CustomException(HttpStatus.BAD_REQUEST, 'PRODUCT_NOT_FOUND', `Sản phẩm #${item.productId} không tồn tại`);
        }
        const subtotal = product.price * item.quantity;
        concessionTotal += subtotal;
        concessionItems.push({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: product.price,
          subtotal,
        });
      }
    }

    // Tính discount nếu có promotion
    let discountAmount = 0;
    let promotionId: number | undefined = undefined;

    if (dto.promotionCode) {
      const promotion = await this.promotionRepository.findOne({
        where: { code: dto.promotionCode },
      });

      if (promotion && promotion.isActive) {
        const startDate = new Date(promotion.startDate);
        const endDate = new Date(promotion.endDate);
        const isValid = now >= startDate && now <= endDate;
        const hasUsage = !promotion.maxUsage || promotion.usedCount < promotion.maxUsage;

        if (isValid && hasUsage) {
          promotionId = promotion.id;
          if (promotion.discountType === EDiscountType.PERCENTAGE) {
            discountAmount = Math.floor((ticketTotal + concessionTotal) * promotion.discountValue / 100);
          } else {
            discountAmount = promotion.discountValue;
          }

          // Cập nhật usedCount
          promotion.usedCount += 1;
          await this.promotionRepository.save(promotion);
        }
      }
    }

    const totalAmount = ticketTotal + concessionTotal - discountAmount;
    const bookingCode = this.generateBookingCode();
    const expiredAt = new Date(now.getTime() + 15 * 60 * 1000); // 15 phút để thanh toán

    // Tạo booking
    const booking = this.bookingRepository.create({
      userId,
      showtimeId: dto.showtimeId,
      promotionId,
      bookingCode,
      totalAmount: Math.max(totalAmount, 0),
      discountAmount,
      status: EBookingStatus.PENDING,
      source: dto.source || EBookingSource.ONLINE,
      expiredAt,
    });

    const savedBooking = await this.bookingRepository.save(booking);

    // Cập nhật seat holds với bookingId
    await this.seatHoldRepository.update(
      {
        showtimeId: dto.showtimeId,
        seatId: In(dto.seatIds),
        userId,
        status: ESeatHoldStatus.HOLDING,
      },
      {
        bookingId: savedBooking.id,
        status: ESeatHoldStatus.CONFIRMED,
      },
    );

    // Tạo booking concessions
    if (concessionItems.length > 0) {
      const bookingConcessions = concessionItems.map(item =>
        this.bookingConcessionRepository.create({
          bookingId: savedBooking.id,
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          subtotal: item.subtotal,
        }),
      );
      await this.bookingConcessionRepository.save(bookingConcessions);
    }

    // Load full booking data
    const fullBooking = await this.bookingRepository.findOne({
      where: { id: savedBooking.id },
      relations: ['bookingConcessions', 'seatHolds'],
    });

    // Emit seat-update realtime sau khi booking được xác nhận
    await this.broadcastSeatUpdate(dto.showtimeId);

    return new ApiResponse(true, 'Tạo đơn đặt vé thành công', fullBooking!);
  }

  // ─── QUERIES ──────────────────────────────────────────────────────────

  async getBookedSeatsForShowtime(showtimeId: number): Promise<ApiResponse<any>> {
    // Ghế đang bị hold trong Redis
    const heldSeatIds = await this.redisService.getHeldSeatIds(showtimeId);

    // Ghế đã được đặt (booking PAID)
    const bookedSeats = await this.seatHoldRepository.find({
      where: {
        showtimeId,
        status: In([ESeatHoldStatus.CONFIRMED]),
      },
      relations: ['seat'],
    });

    const bookedSeatIds = bookedSeats.map(h => h.seatId);

    return new ApiResponse(true, 'Lấy danh sách ghế đã đặt/giữ thành công', {
      heldSeatIds,
      bookedSeatIds,
      allUnavailableSeatIds: [...new Set([...heldSeatIds, ...bookedSeatIds])],
    });
  }

  async getUserBookingHistory(userId: number, page: number = 1, pageSize: number = 10): Promise<ApiResponse<Booking[]>> {
    const skip = (page - 1) * pageSize;
    const [bookings, totalItems] = await this.bookingRepository.findAndCount({
      where: { userId },
      relations: ['showtime', 'showtime.movie', 'showtime.room', 'tickets', 'bookingConcessions', 'payment'],
      order: { createdAt: 'DESC' },
      skip,
      take: pageSize,
    });
    const totalPages = Math.ceil(totalItems / pageSize);
    const response = new ApiResponse(true, 'Lấy lịch sử đặt vé thành công', bookings);
    response.pagination = { page: Number(page), pageSize: Number(pageSize), totalItems, totalPages };
    return response;
  }

  private generateBookingCode(): string {
    const prefix = 'BK';
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
  }

  // ─── Socket Broadcast Helper ──────────────────────────────────────────

  /**
   * Lấy trạng thái ghế hiện tại từ Redis + DB rồi broadcast tới
   * tất cả client đang xem suất chiếu đó qua WebSocket.
   * Nếu SeatGateway chưa được khởi tạo thì bỏ qua (optional injection).
   */
  private async broadcastSeatUpdate(showtimeId: number): Promise<void> {
    if (!this.seatGateway) return;

    // Ghế đang bị giữ trong Redis (hold tạm)
    const heldSeatIds = await this.redisService.getHeldSeatIds(showtimeId);

    // Ghế đã được đặt chính thức (CONFIRMED)
    const confirmedHolds = await this.seatHoldRepository.find({
      where: { showtimeId, status: ESeatHoldStatus.CONFIRMED },
      select: ['seatId'],
    });
    const bookedSeatIds = confirmedHolds.map((h) => h.seatId);

    this.seatGateway.emitSeatUpdate(showtimeId, heldSeatIds, bookedSeatIds);
  }
}
