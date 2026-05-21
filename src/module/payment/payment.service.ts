import { Injectable, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment } from './entities/payment.entity';
import { Booking } from '../booking/entities/booking.entity';
import { MockPaymentDto } from './dto/payment.dto';
import { ApiResponse } from '../../core/dto/ApiResponse.dto';
import { CustomException } from '../../core/exceptions/custom.exception';
import { EPaymentStatus, EPaymentMethod, EPaymentChannel } from './enums/payment.enum';
import { EBookingStatus } from '../booking/enums/booking.enum';
import { TicketService } from '../ticket/ticket.service';
import { NotificationService } from '../notification/notification.service';

@Injectable()
export class PaymentService {
  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
    private readonly ticketService: TicketService,
    private readonly notificationService: NotificationService,
  ) {}

  async mockPayment(userId: number, dto: MockPaymentDto): Promise<ApiResponse<any>> {
    const booking = await this.bookingRepository.findOne({
      where: { id: dto.bookingId },
      relations: ['showtime', 'seatHolds', 'seatHolds.seat'],
    });

    if (!booking) {
      throw new CustomException(HttpStatus.NOT_FOUND, 'BOOKING_NOT_FOUND', 'Không tìm thấy đơn đặt vé');
    }

    if (booking.userId !== userId) {
      throw new CustomException(HttpStatus.FORBIDDEN, 'FORBIDDEN', 'Bạn không có quyền thanh toán đơn này');
    }

    if (booking.status !== EBookingStatus.PENDING) {
      throw new CustomException(HttpStatus.BAD_REQUEST, 'BOOKING_NOT_PENDING', 'Đơn đặt vé không ở trạng thái chờ thanh toán');
    }

    // Kiểm tra xem đã có payment chưa
    let payment = await this.paymentRepository.findOne({
      where: { bookingId: booking.id },
    });

    if (!payment) {
      // Tạo payment mới
      payment = this.paymentRepository.create({
        bookingId: booking.id,
        method: dto.method || EPaymentMethod.BANKING,
        channel: dto.channel || EPaymentChannel.ONLINE,
        amount: booking.totalAmount,
        status: EPaymentStatus.PENDING,
      });
      payment = await this.paymentRepository.save(payment);
    }

    // Mock thanh toán thành công
    const transactionCode = this.generateTransactionCode();
    payment.status = EPaymentStatus.SUCCESS;
    payment.transactionCode = transactionCode;
    payment.paymentDate = new Date();
    await this.paymentRepository.save(payment);

    // Cập nhật booking status
    booking.status = EBookingStatus.PAID;
    await this.bookingRepository.save(booking);

    // Generate tickets
    const tickets = await this.ticketService.generateTicketsForBooking(booking);

    // Tạo notification
    await this.notificationService.createTicketConfirmNotification(
      userId,
      booking.bookingCode,
      tickets.length,
    );

    return new ApiResponse(true, 'Thanh toán thành công', {
      payment: {
        id: payment.id,
        status: payment.status,
        transactionCode: payment.transactionCode,
        amount: payment.amount,
        paymentDate: payment.paymentDate,
      },
      booking: {
        id: booking.id,
        bookingCode: booking.bookingCode,
        status: booking.status,
      },
      ticketsGenerated: tickets.length,
    });
  }

  private generateTransactionCode(): string {
    const prefix = 'TXN';
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
  }
}
