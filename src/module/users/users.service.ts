import { Injectable, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { ApiResponse } from '../../core/dto/ApiResponse.dto';
import { CustomException } from '../../core/exceptions/custom.exception';
import { EUserStatus } from './enums/user.enum';
import { UpdateProfileDto } from './dto/users.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async getAllUsers(page: number = 1, pageSize: number = 10): Promise<ApiResponse<User[]>> {
    const skip = (page - 1) * pageSize;
    const [users, totalItems] = await this.userRepository.findAndCount({
      skip,
      take: pageSize,
      order: { id: 'DESC' },
    });
    const totalPages = Math.ceil(totalItems / pageSize);
    const response = new ApiResponse(true, 'Lấy danh sách người dùng thành công', users);
    response.pagination = { page: Number(page), pageSize: Number(pageSize), totalItems, totalPages };
    return response;
  }

  async updateUserStatus(userId: number, status: EUserStatus): Promise<ApiResponse<User>> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new CustomException(HttpStatus.NOT_FOUND, 'USER_NOT_FOUND', 'Không tìm thấy người dùng');
    }
    user.status = status;
    const updated = await this.userRepository.save(user);
    return new ApiResponse(true, `Cập nhật trạng thái người dùng thành ${status}`, updated);
  }

  async getProfile(userId: number): Promise<ApiResponse<User>> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new CustomException(HttpStatus.NOT_FOUND, 'USER_NOT_FOUND', 'Không tìm thấy người dùng');
    }
    return new ApiResponse(true, 'Lấy thông tin cá nhân thành công', user);
  }

  async updateProfile(userId: number, dto: UpdateProfileDto): Promise<ApiResponse<User>> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new CustomException(HttpStatus.NOT_FOUND, 'USER_NOT_FOUND', 'Khong tim thay nguoi dung');
    }

    const updateData: Record<string, unknown> = {};

    if (dto.fullName !== undefined) {
      const fullName = dto.fullName.trim();
      if (!fullName) {
        throw new CustomException(HttpStatus.BAD_REQUEST, 'VALIDATION_FAILED', 'Vui long nhap ho va ten');
      }
      updateData.fullName = fullName;
    }

    if (dto.phone !== undefined) {
      updateData.phone = dto.phone?.trim() || null;
    }

    if (dto.gender !== undefined) {
      updateData.gender = dto.gender?.trim() || null;
    }

    if (dto.dateOfBirth !== undefined) {
      updateData.dateOfBirth = dto.dateOfBirth ? new Date(dto.dateOfBirth) : null;
    }

    Object.assign(user, updateData);

    const updated = await this.userRepository.save(user);
    return new ApiResponse(true, 'Cập nhật thông tin cá nhân thành công', updated);
  }
}
