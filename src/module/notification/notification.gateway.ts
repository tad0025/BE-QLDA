import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { Notification } from './entities/notification.entity';

@WebSocketGateway({
  namespace: '/notification',
  cors: {
    origin: true,
    credentials: true,
  },
})
export class NotificationGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationGateway.name);

  afterInit() {
    this.logger.log('NotificationGateway initialized – namespace: /notification');
  }

  handleConnection(client: Socket) {
    this.logger.debug(`Client connected to notification: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.debug(`Client disconnected from notification: ${client.id}`);
  }

  @SubscribeMessage('join-notification')
  async handleJoinNotification(
    @MessageBody() data: { userId: number },
    @ConnectedSocket() client: Socket,
  ) {
    const { userId } = data;

    if (!userId || isNaN(Number(userId))) {
      client.emit('error', { message: 'userId không hợp lệ' });
      return;
    }

    const room = this.getRoomName(Number(userId));
    await client.join(room);

    this.logger.debug(`Client ${client.id} joined notification room: ${room}`);

    client.emit('joined', {
      userId: Number(userId),
      message: `Đã join room nhận thông báo cho user #${userId}.`,
    });
  }

  @SubscribeMessage('leave-notification')
  async handleLeaveNotification(
    @MessageBody() data: { userId: number },
    @ConnectedSocket() client: Socket,
  ) {
    const { userId } = data;
    const room = this.getRoomName(Number(userId));
    await client.leave(room);
    this.logger.debug(`Client ${client.id} left notification room: ${room}`);
  }

  /**
   * Phát thông báo mới qua WebSocket cho user cụ thể
   */
  emitNewNotification(userId: number, notification: Notification): void {
    const room = this.getRoomName(userId);
    this.server.to(room).emit('new-notification', notification);
    this.logger.debug(`[new-notification] emitted to room=${room}`);
  }

  private getRoomName(userId: number): string {
    return `user-notification:${userId}`;
  }
}
