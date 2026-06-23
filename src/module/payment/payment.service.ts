import { Injectable, HttpStatus, Logger } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { Cron } from '@nestjs/schedule';

import { Payment } from './entities/payment.entity';
import { Booking } from '../booking/entities/booking.entity';
import { SeatHold } from '../booking/entities/seat-hold.entity';
import { BookingConcession } from '../booking/entities/booking-concession.entity';
import { ConcessionProduct } from '../concession/entities/concession-product.entity';
import { User } from '../users/entities/user.entity';

import { CreatePaymentUrlDto } from './dto/create-payment-url.dto';
import { ApiResponse } from '../../core/dto/ApiResponse.dto';
import { CustomException } from '../../core/exceptions/custom.exception';

import { EPaymentStatus, EPaymentMethod, EPaymentChannel } from './enums/payment.enum';
import { EBookingStatus, ESeatHoldStatus, EBookingSource } from '../booking/enums/booking.enum';
import { ENotificationType } from '../notification/enums/notification.enum';

import { MomoService } from './services/momo.service';
import { VnpayService } from './services/vnpay.service';
import { PaypalService } from './services/paypal.service';
import { TicketService } from '../ticket/ticket.service';
import { RedisService } from '../redis/redis.service';
import { SeatGateway } from '../booking/seat.gateway';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { MailerService } from '@nestjs-modules/mailer';
import * as QRCode from 'qrcode';

/** Tỷ lệ tích điểm: 10% tổng tiền đơn hàng sau khi thanh toán. 100.000đ → 10.000 điểm. */
const LOYALTY_EARN_RATE = 0.10;

const BOOKING_TIMEOUT_MS = 5 * 60 * 1000; // 5 phút – đồng bộ với Redis hold TTL

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
    @InjectRepository(SeatHold)
    private readonly seatHoldRepository: Repository<SeatHold>,
    @InjectRepository(BookingConcession)
    private readonly bookingConcessionRepository: Repository<BookingConcession>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly momoService: MomoService,
    private readonly vnpayService: VnpayService,
    private readonly paypalService: PaypalService,
    private readonly ticketService: TicketService,
    private readonly redisService: RedisService,
    private readonly seatGateway: SeatGateway,
    private readonly eventEmitter: EventEmitter2,
    private readonly mailerService: MailerService,
  ) { }

  // ─── PREPARE CHECKOUT ─────────────────────────────────────────────────
  // Trả về tóm tắt đơn hàng để frontend hiển thị, không thay đổi trạng thái
  async prepareCheckout(userId: number, bookingId: number): Promise<ApiResponse<any>> {
    const booking = await this.bookingRepository.findOne({
      where: { id: bookingId },
      relations: [
        'showtime', 'showtime.movie', 'showtime.room',
        'seatHolds', 'seatHolds.seat', 'seatHolds.seat.room',
        'bookingConcessions', 'bookingConcessions.product',
        'promotion',
        'user'
      ],
    });

    if (!booking) {
      throw new CustomException(HttpStatus.NOT_FOUND, 'BOOKING_NOT_FOUND', 'Không tìm thấy đơn đặt vé');
    }

    if (booking.userId !== userId && booking.staffId !== userId) {
      throw new CustomException(HttpStatus.FORBIDDEN, 'FORBIDDEN', 'Bạn không có quyền xem đơn này');
    }

    if (booking.status !== EBookingStatus.PENDING) {
      throw new CustomException(
        HttpStatus.BAD_REQUEST,
        'BOOKING_NOT_PENDING',
        `Đơn đặt vé không ở trạng thái chờ thanh toán (trạng thái hiện tại: ${booking.status})`,
      );
    }

    const now = new Date();
    if (booking.expiredAt && booking.expiredAt < now) {
      throw new CustomException(HttpStatus.BAD_REQUEST, 'BOOKING_EXPIRED', 'Đơn đặt vé đã hết hạn');
    }

    const seats = booking.seatHolds
      .filter(h => h.status === ESeatHoldStatus.CONFIRMED)
      .map(h => ({
        id: h.seatId,
        row: h.seat?.row,
        column: h.seat?.number,
        roomType: h.seat?.room?.roomType,
      }));

    const concessions = booking.bookingConcessions.map(bc => ({
      productId: bc.productId,
      name: bc.product?.name,
      quantity: bc.quantity,
      unitPrice: bc.unitPrice,
      subtotal: bc.subtotal,
    }));

    const secondsRemaining = booking.expiredAt
      ? Math.max(0, Math.floor((booking.expiredAt.getTime() - now.getTime()) / 1000))
      : 0;

    return new ApiResponse(true, 'Lấy thông tin thanh toán thành công', {
      bookingId: booking.id,
      bookingCode: booking.bookingCode,
      showtime: {
        id: booking.showtimeId,
        movie: booking.showtime?.movie?.title,
        room: booking.showtime?.room?.name,
        publicStartTime: booking.showtime?.publicStartTime,
      },
      seats,
      concessions,
      totalAmount: booking.totalAmount,
      discountAmount: booking.discountAmount,
      promotion: booking.promotion ? {
        code: booking.promotion.code,
        discountType: booking.promotion.discountType,
        discountValue: booking.promotion.discountValue,
      } : null,
      expiredAt: booking.expiredAt,
      secondsRemaining,
      customerId: booking.userId,
      customerName: booking.user?.fullName || booking.user?.email || null,
      loyaltyPoints: booking.user?.loyaltyPoints || 0,
    });
  }

  // ─── CREATE PAYMENT URL ───────────────────────────────────────────────
  // Tạo payUrl và trả về cho frontend redirect. Backend set status = PENDING_PAYMENT.
  // KHÔNG BAO GIỜ set status = PAID ở đây.
  async createPaymentUrl(
    userId: number,
    dto: CreatePaymentUrlDto,
    ipAddr: string,
  ): Promise<ApiResponse<{ bookingId: number; payUrl: string; paymentRequired: boolean }>> {
    // Re-validate booking (dù đã prepare trước, vẫn phải validate lại vì có thể thay đổi giữa hai bước)
    const booking = await this.bookingRepository.findOne({
      where: { id: dto.bookingId },
      relations: ['payment'],
    });

    if (!booking) {
      throw new CustomException(HttpStatus.NOT_FOUND, 'BOOKING_NOT_FOUND', 'Không tìm thấy đơn đặt vé');
    }

    if (booking.userId !== userId && booking.staffId !== userId) {
      throw new CustomException(HttpStatus.FORBIDDEN, 'FORBIDDEN', 'Bạn không có quyền thanh toán đơn này');
    }

    if (booking.status !== EBookingStatus.PENDING) {
      throw new CustomException(
        HttpStatus.BAD_REQUEST,
        'BOOKING_NOT_PENDING',
        `Đơn đặt vé không ở trạng thái hợp lệ: ${booking.status}`,
      );
    }

    const now = new Date();
    if (booking.expiredAt && booking.expiredAt < now) {
      throw new CustomException(HttpStatus.BAD_REQUEST, 'BOOKING_EXPIRED', 'Đơn đặt vé đã hết hạn (quá 5 phút)');
    }

    // Idempotency: nếu đã có payment URL đang chờ, trả về luôn
    if (booking.payment?.payUrl && booking.payment.status === EPaymentStatus.PENDING_PAYMENT) {
      return new ApiResponse(true, 'Trả về link thanh toán đã tạo', {
        bookingId: booking.id,
        payUrl: booking.payment.payUrl,
        paymentRequired: true,
      });
    }

    // Tạo payUrl từ gateway
    let payUrl: string;
    let gatewayOrderId: string | undefined;

    switch (dto.method) {
      case EPaymentMethod.MOMO:
        payUrl = await this.momoService.buildPaymentUrl(booking.bookingCode, booking.totalAmount);
        break;

      case EPaymentMethod.VNPAY:
        payUrl = this.vnpayService.buildPaymentUrl(booking.bookingCode, booking.totalAmount, ipAddr);
        break;

      case EPaymentMethod.PAYPAL: {
        const result = await this.paypalService.buildPaymentUrl(booking.bookingCode, booking.totalAmount);
        payUrl = result.approveUrl;
        gatewayOrderId = result.paypalOrderId;
        break;
      }

      case EPaymentMethod.CASH: {
        if (booking.source !== EBookingSource.OFFLINE) {
          throw new CustomException(HttpStatus.BAD_REQUEST, 'INVALID_PAYMENT_METHOD', 'Thanh toán tiền mặt chỉ áp dụng tại quầy');
        }
        await this.confirmPaymentSuccess(booking, EPaymentMethod.CASH, `CASH-${Date.now()}`);
        return new ApiResponse(true, 'Thanh toán tiền mặt thành công', {
          bookingId: booking.id,
          payUrl: '',
          paymentRequired: false,
        });
      }

      default:
        throw new CustomException(HttpStatus.BAD_REQUEST, 'INVALID_PAYMENT_METHOD', `Phương thức thanh toán không hợp lệ: ${dto.method}`);
    }

    // Lưu payment record với status = PENDING_PAYMENT (KHÔNG PHẢI PAID)
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      let payment = booking.payment;

      if (!payment) {
        payment = queryRunner.manager.create(Payment, {
          bookingId: booking.id,
          method: dto.method,
          channel: EPaymentChannel.ONLINE,
          amount: booking.totalAmount,
          status: EPaymentStatus.PENDING_PAYMENT,
          payUrl,
          gatewayOrderId,
        });
      } else {
        payment.method = dto.method;
        payment.status = EPaymentStatus.PENDING_PAYMENT;
        payment.payUrl = payUrl;
        payment.gatewayOrderId = gatewayOrderId ?? "";
      }

      await queryRunner.manager.save(Payment, payment);
      await queryRunner.commitTransaction();
    } catch (err) {
      await queryRunner.rollbackTransaction();
      this.logger.error('Failed to save payment record', err);
      throw new CustomException(HttpStatus.INTERNAL_SERVER_ERROR, 'PAYMENT_CREATE_FAILED', 'Không thể tạo đơn thanh toán');
    } finally {
      await queryRunner.release();
    }

    return new ApiResponse(true, 'Tạo link thanh toán thành công', {
      bookingId: booking.id,
      payUrl,
      paymentRequired: true,
    });
  }

  // ─── GET PAYMENT STATUS ───────────────────────────────────────────────
  // Frontend gọi endpoint này sau khi quay về từ gateway để lấy trạng thái thật
  async getPaymentStatus(userId: number, bookingId: number): Promise<ApiResponse<any>> {
    const booking = await this.bookingRepository.findOne({
      where: { id: bookingId },
      relations: ['payment'],
    });

    if (!booking) {
      throw new CustomException(HttpStatus.NOT_FOUND, 'BOOKING_NOT_FOUND', 'Không tìm thấy đơn đặt vé');
    }

    if (booking.userId !== userId) {
      throw new CustomException(HttpStatus.FORBIDDEN, 'FORBIDDEN', 'Bạn không có quyền xem đơn này');
    }

    let statusForFrontend: 'PENDING' | 'PAID' | 'FAILED' | 'EXPIRED';

    switch (booking.status) {
      case EBookingStatus.PAID:
        statusForFrontend = 'PAID';
        break;
      case EBookingStatus.EXPIRED:
      case EBookingStatus.CANCELLED:
        statusForFrontend = booking.status === EBookingStatus.EXPIRED ? 'EXPIRED' : 'FAILED';
        break;
      default:
        statusForFrontend = booking.payment?.status === EPaymentStatus.FAILED ? 'FAILED' : 'PENDING';
    }

    return new ApiResponse(true, 'Lấy trạng thái thanh toán thành công', {
      bookingId: booking.id,
      bookingCode: booking.bookingCode,
      status: statusForFrontend,
      paymentMethod: booking.payment?.method,
      transactionCode: booking.payment?.transactionCode,
      paymentDate: booking.payment?.paymentDate,
    });
  }

  // ─── GET PAYMENT STATUS BY BOOKING CODE (no JWT – for returnUrl polling) ──
  async getPaymentStatusByBookingCode(bookingCode: string): Promise<ApiResponse<any>> {
    const booking = await this.bookingRepository.findOne({
      where: { bookingCode },
      relations: ['payment'],
    });

    if (!booking) {
      throw new CustomException(HttpStatus.NOT_FOUND, 'BOOKING_NOT_FOUND', 'Không tìm thấy đơn đặt vé');
    }

    let statusForFrontend: 'PENDING' | 'PAID' | 'FAILED' | 'EXPIRED';

    switch (booking.status) {
      case EBookingStatus.PAID:
        statusForFrontend = 'PAID';
        break;
      case EBookingStatus.EXPIRED:
        statusForFrontend = 'EXPIRED';
        break;
      case EBookingStatus.CANCELLED:
        statusForFrontend = 'FAILED';
        break;
      default:
        statusForFrontend = booking.payment?.status === EPaymentStatus.FAILED ? 'FAILED' : 'PENDING';
    }

    return new ApiResponse(true, 'Lấy trạng thái thanh toán thành công', {
      bookingId: booking.id,
      bookingCode: booking.bookingCode,
      status: statusForFrontend,
      paymentMethod: booking.payment?.method,
      transactionCode: booking.payment?.transactionCode,
      paymentDate: booking.payment?.paymentDate,
    });
  }


  // ─── MOMO IPN HANDLER ────────────────────────────────────────────────
  // Chỉ IPN mới được xác nhận thanh toán thành công, KHÔNG phải returnUrl
  async processMoMoIPN(ipnData: Record<string, any>): Promise<void> {
    // 1. Verify signature trước, từ chối ngay nếu sai
    const isValid = this.momoService.verifyIpnSignature(ipnData);
    if (!isValid) {
      this.logger.warn('MoMo IPN: invalid signature — rejected');
      return;
    }

    const { orderId, resultCode, amount, transId } = ipnData;

    const booking = await this.bookingRepository.findOne({
      where: { bookingCode: orderId },
      relations: ['payment', 'showtime'],
    });

    if (!booking) {
      this.logger.warn(`MoMo IPN: booking not found for orderId=${orderId}`);
      return;
    }

    // 2. Kiểm tra amount khớp với DB (chống giả mạo số tiền)
    if (Number(amount) !== booking.totalAmount) {
      this.logger.warn(`MoMo IPN: amount mismatch. Expected=${booking.totalAmount}, Got=${amount}`);
      return;
    }

    // 3. Idempotency: nếu đã PAID thì không làm gì
    if (booking.status === EBookingStatus.PAID) {
      this.logger.log(`MoMo IPN: booking ${orderId} already PAID — idempotent skip`);
      return;
    }

    // 4. Nếu đã EXPIRED thì không cập nhật thành PAID
    if (booking.status === EBookingStatus.EXPIRED) {
      this.logger.warn(`MoMo IPN: booking ${orderId} is EXPIRED — cannot set PAID`);
      return;
    }

    if (resultCode === 0) {
      await this.confirmPaymentSuccess(booking, EPaymentMethod.MOMO, String(transId));
    } else {
      await this.markPaymentFailed(booking);
      this.logger.warn(`MoMo IPN: payment failed for ${orderId}, resultCode=${resultCode}`);
    }
  }

  // ─── VNPAY IPN HANDLER ───────────────────────────────────────────────
  async processVnpayIPN(query: Record<string, any>): Promise<{ RspCode: string; Message: string }> {
    // 1. Verify signature
    const isValid = this.vnpayService.verifyIpnSignature(query);
    if (!isValid) {
      this.logger.warn('VNPay IPN: invalid signature — rejected');
      return { RspCode: '97', Message: 'Invalid signature' };
    }

    const orderId = query['vnp_TxnRef'];
    const responseCode = query['vnp_ResponseCode'];
    const vnpAmount = Number(query['vnp_Amount']);
    const transId = query['vnp_TransactionNo'];

    const booking = await this.bookingRepository.findOne({
      where: { bookingCode: orderId },
      relations: ['payment', 'showtime'],
    });

    if (!booking) {
      this.logger.warn(`VNPay IPN: booking not found for orderId=${orderId}`);
      return { RspCode: '01', Message: 'Order not found' };
    }

    // 2. Kiểm tra amount (VNPay gửi amount * 100)
    if (vnpAmount !== booking.totalAmount * 100) {
      this.logger.warn(`VNPay IPN: amount mismatch. Expected=${booking.totalAmount * 100}, Got=${vnpAmount}`);
      return { RspCode: '04', Message: 'Invalid amount' };
    }

    // 3. Idempotency check
    if (booking.status === EBookingStatus.PAID) {
      this.logger.log(`VNPay IPN: booking ${orderId} already PAID — idempotent skip`);
      return { RspCode: '02', Message: 'Order already confirmed' };
    }

    if (booking.status === EBookingStatus.EXPIRED) {
      this.logger.warn(`VNPay IPN: booking ${orderId} is EXPIRED — cannot set PAID`);
      return { RspCode: '02', Message: 'Order expired' };
    }

    if (responseCode === '00') {
      await this.confirmPaymentSuccess(booking, EPaymentMethod.VNPAY, transId);
    } else {
      await this.markPaymentFailed(booking);
      this.logger.warn(`VNPay IPN: payment failed for ${orderId}, responseCode=${responseCode}`);
    }

    return { RspCode: '00', Message: 'Confirm Success' };
  }

  // ─── PAYPAL CAPTURE (sau khi user approve) ───────────────────────────
  async capturePayPalOrder(bookingCode: string): Promise<string> {
    const booking = await this.bookingRepository.findOne({
      where: { bookingCode },
      relations: ['payment', 'showtime'],
    });

    if (!booking) {
      this.logger.warn(`PayPal capture: booking not found for bookingCode=${bookingCode}`);
      return bookingCode;
    }

    // Idempotency
    if (booking.status === EBookingStatus.PAID) {
      return bookingCode;
    }

    if (booking.status === EBookingStatus.EXPIRED) {
      this.logger.warn(`PayPal capture: booking ${bookingCode} is EXPIRED`);
      return bookingCode;
    }

    const paypalOrderId = booking.payment?.gatewayOrderId;
    if (!paypalOrderId) {
      this.logger.warn(`PayPal capture: no gatewayOrderId for booking ${bookingCode}`);
      return bookingCode;
    }

    const isSuccess = await this.paypalService.captureOrder(paypalOrderId);
    if (isSuccess) {
      await this.confirmPaymentSuccess(booking, EPaymentMethod.PAYPAL, paypalOrderId);
    } else {
      await this.markPaymentFailed(booking);
    }

    return bookingCode;
  }

  // ─── PAYPAL CANCEL ───────────────────────────────────────────────────
  async cancelPayPalOrder(bookingCode: string): Promise<void> {
    const booking = await this.bookingRepository.findOne({
      where: { bookingCode },
      relations: ['payment'],
    });

    if (booking && booking.status === EBookingStatus.PENDING) {
      await this.markPaymentFailed(booking);
    }
  }

  // ─── CONFIRM PAYMENT (atomic transaction) ─────────────────────────────
  // Đây là hàm duy nhất được phép set booking.status = PAID
  private async confirmPaymentSuccess(
    booking: Booking,
    method: EPaymentMethod,
    transactionCode: string,
  ): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const lockedBooking = await queryRunner.manager.findOne(Booking, {
        where: { id: booking.id },
        relations: ['payment'],
        lock: { mode: 'pessimistic_write' },
      });

      if (!lockedBooking) {
        throw new CustomException(HttpStatus.NOT_FOUND, 'BOOKING_NOT_FOUND', 'Khong tim thay don dat ve');
      }

      if (lockedBooking.status === EBookingStatus.PAID) {
        await queryRunner.commitTransaction();
        return;
      }

      const bookingConcessions = await queryRunner.manager.find(BookingConcession, {
        where: { bookingId: booking.id },
      });

      for (const item of bookingConcessions) {
        if (item.quantity <= 0) continue;

        await queryRunner.manager
          .createQueryBuilder()
          .update(ConcessionProduct)
          .set({
            stockQuantity: () => `GREATEST(stockQuantity - ${Number(item.quantity)}, 0)`,
          })
          .where('id = :productId', { productId: item.productId })
          .execute();
      }

      // Update booking status = PAID
      await queryRunner.manager.update(Booking, { id: booking.id }, {
        status: EBookingStatus.PAID,
      });

      // Update payment
      const transCode = `TXN-${transactionCode}-${Date.now().toString(36).toUpperCase()}`;
      if (lockedBooking.payment) {
        await queryRunner.manager.update(Payment, { id: lockedBooking.payment.id }, {
          status: EPaymentStatus.SUCCESS,
          method,
          transactionCode: transCode,
          paymentDate: new Date(),
        });
      } else {
        const payment = queryRunner.manager.create(Payment, {
          bookingId: booking.id,
          method,
          channel: EPaymentChannel.ONLINE,
          amount: booking.totalAmount,
          status: EPaymentStatus.SUCCESS,
          transactionCode: transCode,
          paymentDate: new Date(),
        });
        await queryRunner.manager.save(Payment, payment);
      }

      await queryRunner.commitTransaction();
    } catch (err) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`confirmPaymentSuccess failed for booking ${booking.id}`, err);
      throw err;
    } finally {
      await queryRunner.release();
    }

    // Các action sau transaction (không cần rollback nếu fail)
    try {
      // ─── Tích điểm loyalty cho user ──────────────────────────────────────────────────────
      const pointsEarned = Math.floor(booking.totalAmount * LOYALTY_EARN_RATE);
      if (pointsEarned > 0 && booking.userId) {
        await this.userRepository.update(
          { id: booking.userId },
          { loyaltyPoints: () => `loyaltyPoints + ${pointsEarned}` },
        );
        this.logger.log(`Loyalty: +${pointsEarned} điểm cho userId=${booking.userId} (booking ${booking.bookingCode})`);
      }
      const fullBooking = await this.bookingRepository.findOne({
        where: { id: booking.id },
        relations: ['showtime', 'showtime.movie', 'showtime.room', 'seatHolds', 'seatHolds.seat', 'user'],
      });

      if (fullBooking) {
        const tickets = await this.ticketService.generateTicketsForBooking(fullBooking);

        // Send email to user
        if (fullBooking.user && fullBooking.user.email) {
          const seatNames = fullBooking.seatHolds.map(h => `${h.seat.row}${h.seat.number}`).join(', ');
          const showtimeDate = new Date(fullBooking.showtime.publicStartTime).toLocaleString('vi-VN');

          // Generate QR code as PNG Buffer (CID attachment — works in all email clients)
          const ticketSections: string[] = [];
          const attachments: any[] = [];

          for (const ticket of tickets) {
            const cid = `qr-${ticket.id}@cineplex`;
            const qrBuffer = await QRCode.toBuffer(ticket.qrCode, {
              width: 200,
              margin: 2,
              color: { dark: '#1a2744', light: '#ffffff' },
            });
            attachments.push({
              filename: `qr-${ticket.id}.png`,
              content: qrBuffer,
              cid,
            });

            const correspondingHold = fullBooking.seatHolds.find(h => h.seatId === ticket.seatId);
            const seatLabel = correspondingHold
              ? `${correspondingHold.seat.row}${correspondingHold.seat.number}`
              : ticket.qrCode;

            ticketSections.push(`
              <div style="display:inline-block; background:#f8faff; border:1px solid #dde8ff; border-radius:10px; padding:16px; margin:8px; text-align:center; vertical-align:top; width:200px;">
                <p style="margin:0 0 8px 0; font-weight:bold; font-size:16px; color:#1a2744;">Ghế ${seatLabel}</p>
                <img src="cid:${cid}" alt="QR vé ghế ${seatLabel}" width="180" height="180" style="display:block; margin:0 auto; border-radius:6px;" />
                <p style="margin:8px 0 0 0; font-size:10px; color:#888; word-break:break-all;">${ticket.qrCode}</p>
              </div>
            `);
          }

          const emailHtml = `
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 640px; margin: 0 auto; border: 1px solid #eeeeee; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.08);">
              <div style="background: linear-gradient(135deg, #1a2744 0%, #2d89ef 100%); padding: 24px; text-align: center;">
                <h2 style="color: #ffffff; margin: 0; font-size: 26px; letter-spacing: 1px;">CINEPLEX</h2>
                <p style="color: #c8dfff; margin: 6px 0 0 0; font-size: 14px;">Ve xem phim cua ban da san sang!</p>
              </div>
              <div style="padding: 28px; line-height: 1.7; color: #333333;">
                <p>Chao <strong>${fullBooking.user.fullName || fullBooking.user.email}</strong>,</p>
                <p>Cam on ban da dat ve tai CINEPLEX. Duoi day la thong tin ve cua ban:</p>
                <div style="background-color: #f0f7ff; border-left: 4px solid #2d89ef; padding: 16px; margin: 20px 0; border-radius: 6px;">
                  <p style="margin:4px 0;"><strong>Ma don hang:</strong> <span style="color: #f26b38; font-weight: bold; font-size:15px;">${fullBooking.bookingCode}</span></p>
                  <p style="margin:4px 0;"><strong>Phim:</strong> ${fullBooking.showtime?.movie?.title || 'Phim'}</p>
                  <p style="margin:4px 0;"><strong>Suat chieu:</strong> ${showtimeDate}</p>
                  <p style="margin:4px 0;"><strong>Phong chieu:</strong> ${fullBooking.showtime?.room?.name || ''}</p>
                  <p style="margin:4px 0;"><strong>Ghe:</strong> ${seatNames}</p>
                  <p style="margin:4px 0;"><strong>Tong tien:</strong> <span style="color:#f26b38; font-weight:bold;">${fullBooking.totalAmount.toLocaleString('vi-VN')} VND</span></p>
                </div>
                <div style="margin: 24px 0; text-align: center;">
                  <p style="font-weight: bold; font-size: 15px; margin-bottom: 12px; color: #1a2744;">Ma QR ve — quet tai quay soat ve</p>
                  <div style="text-align:center;">${ticketSections.join('')}</div>
                </div>
                <p style="color:#666; font-size:13px;">Vui long xuat trinh email nay hoac truy cap muc <strong>"Ve cua toi"</strong> tren website khi den rap.</p>
                <p>Chuc ban xem phim vui ve!</p>
              </div>
              <div style="background-color: #f5f7fa; padding: 14px; text-align: center; border-top: 1px solid #eeeeee;">
                <span style="font-size: 12px; color: #aaaaaa;">&copy; 2026 CINEPLEX. All rights reserved.</span>
              </div>
            </div>
          `;

          await this.mailerService.sendMail({
            to: fullBooking.user.email,
            subject: `Xac nhan dat ve thanh cong - ${fullBooking.bookingCode}`,
            html: emailHtml,
            attachments,
          });
          this.logger.log(`Sent ticket email to ${fullBooking.user.email}`);
        }
      }

      this.eventEmitter.emit('notification.create', {
        userId: booking.userId,
        subject: 'Đặt vé thành công!',
        content: `Đơn hàng ${booking.bookingCode} đã được thanh toán. Vé của bạn đã sẵn sàng. Vào mục "Vé của tôi" để xem.`,
        type: ENotificationType.TICKET_CONFIRM,
        link: '/booking-history',
      });
    } catch (err) {
      this.logger.error(`Post-payment actions failed for booking ${booking.id}`, err);
    }

    this.logger.log(`Payment confirmed for booking ${booking.bookingCode}`);
  }

  // ─── MARK FAILED ──────────────────────────────────────────────────────
  private async markPaymentFailed(booking: Booking): Promise<void> {
    await this.bookingRepository.update({ id: booking.id }, { status: EBookingStatus.CANCELLED });
    if (booking.payment) {
      await this.paymentRepository.update({ id: booking.payment.id }, { status: EPaymentStatus.FAILED });
    }

    // Hoàn điểm nếu booking có dùng điểm tích lũy
    if (booking.pointsUsed > 0 && booking.userId) {
      await this.userRepository.update(
        { id: booking.userId },
        { loyaltyPoints: () => `loyaltyPoints + ${booking.pointsUsed}` },
      );
      this.logger.log(`Loyalty refund: +${booking.pointsUsed} điểm cho userId=${booking.userId} (booking ${booking.bookingCode} failed)`);
    }

    await this.releaseBookingResources(booking);

    this.eventEmitter.emit('notification.create', {
      userId: booking.userId,
      subject: 'Thanh toán thất bại',
      content: `Đơn hàng ${booking.bookingCode} đã bị hủy do thanh toán thất bại. Vui lòng thử lại.${booking.pointsUsed > 0 ? ` Điểm tích lũy đã được hoàn trả (${booking.pointsUsed.toLocaleString()} điểm).` : ''}`,
      type: ENotificationType.PAYMENT_FAILED,
      link: '/booking-history',
    });
  }

  // ─── CRON: EXPIRE OVERDUE BOOKINGS ───────────────────────────────────
  // Chạy mỗi 1 phút, expire những booking quá 5 phút chưa thanh toán
  @Cron('*/1 * * * *')
  async expireOverdueBookings(): Promise<void> {
    const now = new Date();

    const overdueBookings = await this.bookingRepository.find({
      where: { status: EBookingStatus.PENDING },
      relations: ['payment', 'seatHolds'],
    });

    const toExpire = overdueBookings.filter(b => b.expiredAt && b.expiredAt < now);

    if (toExpire.length === 0) return;

    this.logger.log(`Cron: expiring ${toExpire.length} overdue bookings`);

    for (const booking of toExpire) {
      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();

      try {
        await queryRunner.manager.update(Booking, { id: booking.id }, {
          status: EBookingStatus.EXPIRED,
        });

        if (booking.payment && booking.payment.status !== EPaymentStatus.SUCCESS) {
          await queryRunner.manager.update(Payment, { id: booking.payment.id }, {
            status: EPaymentStatus.FAILED,
          });
        }

        const seatHoldIds = booking.seatHolds
          .filter(h => h.status !== ESeatHoldStatus.RELEASED)
          .map(h => h.id);

        if (seatHoldIds.length > 0) {
          await queryRunner.manager.update(
            SeatHold,
            { id: In(seatHoldIds) },
            { status: ESeatHoldStatus.RELEASED },
          );
        }

        await queryRunner.commitTransaction();

        // Hoàn điểm nếu booking có dùng điểm tích lũy
        if (booking.pointsUsed > 0 && booking.userId) {
          await this.userRepository.update(
            { id: booking.userId },
            { loyaltyPoints: () => `loyaltyPoints + ${booking.pointsUsed}` },
          );
          this.logger.log(`Loyalty refund: +${booking.pointsUsed} điểm cho userId=${booking.userId} (booking ${booking.bookingCode} expired)`);
        }

        // Giải phóng Redis keys và broadcast seat update
        await this.releaseBookingResources(booking);

        const expireContent = `Đơn hàng ${booking.bookingCode} đã bị hủy do quá thời gian thanh toán. Vui lòng đặt lại vé.${booking.pointsUsed > 0 ? ` Điểm tích lũy đã được hoàn trả (${booking.pointsUsed.toLocaleString()} điểm).` : ''}`;
        this.eventEmitter.emit('notification.create', {
          userId: booking.userId,
          subject: 'Đơn hàng hết hạn',
          content: expireContent,
          type: ENotificationType.PAYMENT_FAILED,
          link: '/booking-history',
        });

        this.logger.log(`Booking ${booking.bookingCode} expired and released`);
      } catch (err) {
        await queryRunner.rollbackTransaction();
        this.logger.error(`Failed to expire booking ${booking.id}`, err);
      } finally {
        await queryRunner.release();
      }
    }
  }

  // ─── RELEASE RESOURCES (Redis + Socket) ─────────────────────────────
  private async releaseBookingResources(booking: Booking): Promise<void> {
    const seatHolds = booking.seatHolds?.length
      ? booking.seatHolds
      : await this.seatHoldRepository.find({ where: { bookingId: booking.id } });

    if (!seatHolds || seatHolds.length === 0) return;

    const showtimeId = seatHolds[0]?.showtimeId ?? booking.showtimeId;
    const seatIds = seatHolds.map(h => h.seatId);

    await this.redisService.releaseSeats(showtimeId, seatIds);

    if (this.seatGateway) {
      const remainingHeld = await this.redisService.getHeldSeatIds(showtimeId);
      const confirmedHolds = await this.seatHoldRepository.find({
        where: { showtimeId, status: ESeatHoldStatus.CONFIRMED },
        select: ['seatId'],
      });
      const bookedSeatIds = confirmedHolds.map(h => h.seatId);
      this.seatGateway.emitSeatUpdate(showtimeId, remainingHeld, bookedSeatIds);
    }
  }
}
