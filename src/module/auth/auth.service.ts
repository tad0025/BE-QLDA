import { Injectable } from '@nestjs/common';
import { ApiResponse } from '../../core/dto/ApiResponse.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
  ) { }

  async login(loginDto: LoginDto): Promise<ApiResponse<any>> {

    return new ApiResponse(true, 'Đăng nhập thành công', {
      accessToken: '1',
      user: {
        id: 1,
        email: '1',
        fullName: '1',
        role: 1,
        avatarUrl: '1'
      }
    });
  }
}