import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
    handleRequest(err, user, info) {
        // Không ném lỗi 401 nếu không có user, chỉ trả về user hoặc undefined
        return user || undefined;
    }
}