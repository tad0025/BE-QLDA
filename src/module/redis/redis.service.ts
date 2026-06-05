import { Injectable, OnModuleDestroy, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { ENV_VARS } from '../../constants/env.constants';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis;

  constructor(private readonly config: ConfigService) { }

  onModuleInit() {
    const host = this.config.get<string>(ENV_VARS.REDIS_HOST, 'localhost');
    this.client = new Redis({
      host: host,
      port: this.config.get<number>(ENV_VARS.REDIS_PORT, 6379),
      username: this.config.get<string>(ENV_VARS.REDIS_USER, 'default'),
      password: this.config.get<string>(ENV_VARS.REDIS_PASS),
      db: this.config.get<number>(ENV_VARS.REDIS_DB, 0),
      lazyConnect: true,
      tls: host !== 'localhost' && host !== '127.0.0.1' ? {} : undefined,
    });

    this.client.on('connect', () =>
      this.logger.log('Redis connected'),
    );
    this.client.on('error', (err) =>
      this.logger.error('Redis error', err),
    );
  }

  onModuleDestroy() {
    this.client.quit();
  }

  // ─── Key builder ────────────────────────────────────────────────────
  private seatHoldKey(showtimeId: number, seatId: number): string {
    return `hold:showtime:${showtimeId}:seat:${seatId}`;
  }

  // ─── Seat Hold Operations ────────────────────────────────────────────

  /**
   * Giữ ghế tạm thời bằng SET NX EX (atomic).
   * @returns true nếu giữ thành công, false nếu ghế đang bị giữ bởi người khác
   */
  async holdSeat(
    showtimeId: number,
    seatId: number,
    userId: number,
    ttlSeconds = 300,
  ): Promise<boolean> {
    const key = this.seatHoldKey(showtimeId, seatId);
    const result = await this.client.set(
      key,
      String(userId),
      'EX',
      ttlSeconds,
      'NX',
    );
    return result === 'OK';
  }

  /**
   * Kiểm tra ghế có đang bị giữ không.
   * @returns userId đang giữ ghế, hoặc null nếu ghế trống
   */
  async getSeatHolder(
    showtimeId: number,
    seatId: number,
  ): Promise<number | null> {
    const key = this.seatHoldKey(showtimeId, seatId);
    const value = await this.client.get(key);
    return value ? Number(value) : null;
  }

  /**
   * Giải phóng ghế sau khi thanh toán thành công hoặc hủy hold.
   */
  async releaseSeat(showtimeId: number, seatId: number): Promise<void> {
    const key = this.seatHoldKey(showtimeId, seatId);
    await this.client.del(key);
  }

  /**
   * Giải phóng nhiều ghế cùng lúc (dùng khi hủy booking).
   */
  async releaseSeats(
    showtimeId: number,
    seatIds: number[],
  ): Promise<void> {
    if (seatIds.length === 0) return;
    const keys = seatIds.map((id) => this.seatHoldKey(showtimeId, id));
    await this.client.del(...keys);
  }

  /**
   * Lấy danh sách seatId đang bị giữ trong 1 suất chiếu.
   * Dùng SCAN thay vì KEYS để an toàn với production.
   */
  async getHeldSeatIds(showtimeId: number): Promise<number[]> {
    const pattern = `hold:showtime:${showtimeId}:seat:*`;
    const keys: string[] = [];
    let cursor = '0';

    do {
      const [nextCursor, found] = await this.client.scan(
        cursor,
        'MATCH',
        pattern,
        'COUNT',
        100,
      );
      cursor = nextCursor;
      keys.push(...found);
    } while (cursor !== '0');

    return keys.map((k) => Number(k.split(':seat:')[1]));
  }

  /**
   * Kiểm tra TTL còn lại của hold (giây).
   * @returns -1 nếu không hết hạn, -2 nếu key không tồn tại, số dương là giây còn lại
   */
  async getSeatHoldTTL(showtimeId: number, seatId: number): Promise<number> {
    const key = this.seatHoldKey(showtimeId, seatId);
    return this.client.ttl(key);
  }

  // ─── Generic Methods (dùng cho tính năng khác nếu cần) ───────────────

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds) {
      await this.client.set(key, value, 'EX', ttlSeconds);
    } else {
      await this.client.set(key, value);
    }
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }
}
