import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from './entities/notification.entity';
import { ApiResponse } from '../../core/dto/ApiResponse.dto';
import { ENotificationType } from './enums/notification.enum';
import { NotificationGateway } from './notification.gateway';
import { OnEvent } from '@nestjs/event-emitter';
import { Booking } from '../booking/entities/booking.entity';
import { User } from '../users/entities/user.entity';
import { EBookingStatus } from '../booking/enums/booking.enum';
import { EUserStatus } from '../users/enums/user.enum';

@Injectable()
export class NotificationService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
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
   * Lắng nghe sự kiện suất chiếu bị hủy
   */
  @OnEvent('showtime.cancelled')
  async handleShowtimeCancelled(payload: { showtimeId: number; movieTitle: string }) {
    const bookings = await this.bookingRepository.find({
      where: [
        { showtimeId: payload.showtimeId, status: EBookingStatus.PAID },
        { showtimeId: payload.showtimeId, status: EBookingStatus.PENDING },
      ],
      select: ['userId', 'bookingCode'],
    });

    const notifications = bookings
      .filter((b) => b.userId)
      .map((booking) => {
        return this.notificationRepository.create({
          userId: booking.userId,
          subject: 'Suất chiếu bị hủy',
          content: `Rất tiếc, suất chiếu phim "${payload.movieTitle}" của đơn hàng ${booking.bookingCode} đã bị hủy. Vui lòng liên hệ CSKH để được hỗ trợ.`,
          type: ENotificationType.SYSTEM,
          isSent: true,
          sentAt: new Date(),
        });
      });

    if (notifications.length > 0) {
      const savedNotifications = await this.notificationRepository.save(notifications);
      savedNotifications.forEach((n) => {
        this.notificationGateway.emitNewNotification(n.userId, n);
      });
    }
  }

  /**
   * Lắng nghe sự kiện suất chiếu bị thay đổi giờ/phòng
   */
  @OnEvent('showtime.changed')
  async handleShowtimeChanged(payload: { showtimeId: number; movieTitle: string }) {
    const bookings = await this.bookingRepository.find({
      where: [
        { showtimeId: payload.showtimeId, status: EBookingStatus.PAID },
        { showtimeId: payload.showtimeId, status: EBookingStatus.PENDING },
      ],
      select: ['userId', 'bookingCode'],
    });

    const notifications = bookings
      .filter((b) => b.userId)
      .map((booking) => {
        return this.notificationRepository.create({
          userId: booking.userId,
          subject: 'Thay đổi thông tin suất chiếu',
          content: `Suất chiếu phim "${payload.movieTitle}" của đơn hàng ${booking.bookingCode} vừa có sự thay đổi về giờ hoặc phòng chiếu. Vui lòng kiểm tra lại chi tiết vé.`,
          type: ENotificationType.SYSTEM,
          isSent: true,
          sentAt: new Date(),
          link: '/booking-history',
        });
      });

    if (notifications.length > 0) {
      const savedNotifications = await this.notificationRepository.save(notifications);
      savedNotifications.forEach((n) => {
        this.notificationGateway.emitNewNotification(n.userId, n);
      });
    }
  }

  /**
   * Lắng nghe sự kiện có mã khuyến mãi mới
   */
  @OnEvent('promotion.created')
  async handlePromotionCreated(promotion: any) {
    const users = await this.userRepository.find({
      where: { status: EUserStatus.ACTIVE },
      select: ['id'],
    });

    const discountText =
      promotion.discountType === 'PERCENTAGE'
        ? `${promotion.discountValue}%`
        : `${promotion.discountValue.toLocaleString('vi-VN')} VNĐ`;

    const notifications = users.map((user) => {
      return this.notificationRepository.create({
        userId: user.id,
        subject: 'Mã khuyến mãi mới',
        content: `Mã giảm giá mới dành cho bạn: Nhập ${promotion.code} để được giảm ${discountText}. Nhanh tay đặt vé ngay!`,
        type: ENotificationType.PROMOTION,
        isSent: true,
        sentAt: new Date(),
      });
    });

    if (notifications.length > 0) {
      // Để tối ưu, insert hàng loạt
      const savedNotifications = await this.notificationRepository.save(notifications, { chunk: 100 });
      savedNotifications.forEach((n) => {
        this.notificationGateway.emitNewNotification(n.userId, n);
      });
    }
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
