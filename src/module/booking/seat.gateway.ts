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

/**
 * SeatGateway – WebSocket Gateway cho Seat Map Realtime
 */
@WebSocketGateway({
  namespace: '/seat',
  cors: {
    origin: '*',
    credentials: true,
  },
})
export class SeatGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(SeatGateway.name);

  // ─── Lifecycle Hooks ──────────────────────────────────────────────────

  afterInit() {
    this.logger.log('SeatGateway initialized – namespace: /seat');
  }

  handleConnection(client: Socket) {
    this.logger.debug(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.debug(`Client disconnected: ${client.id}`);
  }

  // ─── Client → Server Events ───────────────────────────────────────────

  /**
   * Client join vào room của suất chiếu để nhận seat-update realtime.
   * Emit: "joined" xác nhận thành công.
   */
  @SubscribeMessage('join-showtime')
  async handleJoinShowtime(
    @MessageBody() data: { showtimeId: number },
    @ConnectedSocket() client: Socket,
  ) {
    const { showtimeId } = data;

    if (!showtimeId || isNaN(Number(showtimeId))) {
      client.emit('error', { message: 'showtimeId không hợp lệ' });
      return;
    }

    const room = this.getRoomName(Number(showtimeId));
    await client.join(room);

    this.logger.debug(`Client ${client.id} joined room: ${room}`);

    client.emit('joined', {
      showtimeId: Number(showtimeId),
      message: `Đã join room suất chiếu #${showtimeId}. Lắng nghe event "seat-update" để nhận trạng thái ghế realtime.`,
    });
  }

  /**
   * Client rời khỏi room của suất chiếu.
   */
  @SubscribeMessage('leave-showtime')
  async handleLeaveShowtime(
    @MessageBody() data: { showtimeId: number },
    @ConnectedSocket() client: Socket,
  ) {
    const { showtimeId } = data;
    const room = this.getRoomName(Number(showtimeId));
    await client.leave(room);
    this.logger.debug(`Client ${client.id} left room: ${room}`);
  }

  // ─── Server → Client Broadcasts ───────────────────────────────────────

  /**
   * @param showtimeId  ID suất chiếu
   * @param heldSeatIds       Danh sách ghế đang bị giữ tạm (Redis hold, 5 phút)
   * @param bookedSeatIds     Danh sách ghế đã được đặt chính thức (CONFIRMED)
   */
  emitSeatUpdate(
    showtimeId: number,
    heldSeatIds: number[],
    bookedSeatIds: number[],
  ): void {
    const room = this.getRoomName(showtimeId);
    const allUnavailableSeatIds = [...new Set([...heldSeatIds, ...bookedSeatIds])];

    this.server.to(room).emit('seat-update', {
      showtimeId,
      heldSeatIds,
      bookedSeatIds,
      allUnavailableSeatIds,
    });

    this.logger.debug(
      `[seat-update] room=${room} held=${heldSeatIds.length} booked=${bookedSeatIds.length}`,
    );
  }

  private getRoomName(showtimeId: number): string {
    return `showtime:${showtimeId}`;
  }
}
