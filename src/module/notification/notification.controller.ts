import { Controller, Get, Query, UseGuards, HttpCode, HttpStatus, Request, Patch, Param, ParseIntPipe } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { JwtAuthGuard } from '../../core/security/jwt/jwt-auth.guard';

@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async getUserNotifications(
    @Request() req,
    @Query('page') page: number = 1,
    @Query('pageSize') pageSize: number = 10,
  ) {
    return this.notificationService.getUserNotifications(req.user.id, page, pageSize);
  }

  @Get('unread-count')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async getUnreadCount(@Request() req) {
    return this.notificationService.getUnreadCount(req.user.id);
  }

  @Patch('read-all')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async markAllAsRead(@Request() req) {
    return this.notificationService.markAllAsRead(req.user.id);
  }

  @Patch(':id/read')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async markAsRead(@Request() req, @Param('id', ParseIntPipe) id: number) {
    return this.notificationService.markAsRead(req.user.id, id);
  }
}
