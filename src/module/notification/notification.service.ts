import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from './entities/notification.entity';
import { ApiResponse } from '../../core/dto/ApiResponse.dto';
import { ENotificationType } from './enums/notification.enum';

@Injectable()
export class NotificationService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
  ) {}

  /**
   * Tạo thông báo xác nhận vé khi thanh toán thành công (nội bộ, không cần API)
   */
  async createTicketConfirmNotification(
    userId: number,
    bookingCode: string,
    ticketCount: number,
  ): Promise<Notification> {
    const notification = this.notificationRepository.create({
      userId,
      subject: 'Đặt vé thành công',
      content: `Đơn hàng ${bookingCode} đã được thanh toán thành công. Bạn có ${ticketCount} vé. Vui lòng kiểm tra trong phần "Vé của tôi".`,
      type: ENotificationType.TICKET_CONFIRM,
      isSent: true,
      sentAt: new Date(),
    });
    return this.notificationRepository.save(notification);
  }

  /**
   * Lấy danh sách thông báo của user
   */
  async getUserNotifications(userId: number, page: number = 1, pageSize: number = 10): Promise<ApiResponse<Notification[]>> {
    const skip = (page - 1) * pageSize;
    const [notifications, totalItems] = await this.notificationRepository.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      skip,
      take: pageSize,
    });
    const totalPages = Math.ceil(totalItems / pageSize);
    const response = new ApiResponse(true, 'Lấy danh sách thông báo thành công', notifications);
    response.pagination = { page: Number(page), pageSize: Number(pageSize), totalItems, totalPages };
    return response;
  }
}
