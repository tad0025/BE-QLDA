import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from './entities/notification.entity';
import { ApiResponse } from '../../core/dto/ApiResponse.dto';
import { ENotificationType } from './enums/notification.enum';
import { NotificationGateway } from './notification.gateway';
import { OnEvent } from '@nestjs/event-emitter';

@Injectable()
export class NotificationService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    private readonly notificationGateway: NotificationGateway,
  ) {}

  /**
   * Lắng nghe sự kiện để tạo thông báo chung
   */
  @OnEvent('notification.create')
  async handleNotificationCreateEvent(payload: {
    userId: number;
    subject: string;
    content: string;
    type: ENotificationType;
    link?: string;
  }) {
    const notification = this.notificationRepository.create({
      ...payload,
      isSent: true,
      sentAt: new Date(),
    });
    const savedNotification = await this.notificationRepository.save(notification);
    this.notificationGateway.emitNewNotification(payload.userId, savedNotification);
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

  /**
   * Đánh dấu 1 thông báo là đã đọc
   */
  async markAsRead(userId: number, notificationId: number): Promise<ApiResponse<null>> {
    const notification = await this.notificationRepository.findOne({
      where: { id: notificationId, userId },
    });

    if (!notification) {
      throw new NotFoundException('Không tìm thấy thông báo');
    }

    notification.isRead = true;
    notification.readAt = new Date();
    await this.notificationRepository.save(notification);

    return new ApiResponse(true, 'Đã đánh dấu đọc', null);
  }

  /**
   * Đánh dấu tất cả thông báo của user là đã đọc
   */
  async markAllAsRead(userId: number): Promise<ApiResponse<null>> {
    await this.notificationRepository.update(
      { userId, isRead: false },
      { isRead: true, readAt: new Date() },
    );

    return new ApiResponse(true, 'Đã đánh dấu đọc tất cả', null);
  }

  /**
   * Lấy số lượng thông báo chưa đọc
   */
  async getUnreadCount(userId: number): Promise<ApiResponse<{ count: number }>> {
    const count = await this.notificationRepository.count({
      where: { userId, isRead: false },
    });

    return new ApiResponse(true, 'Lấy số lượng chưa đọc thành công', { count });
  }
}
