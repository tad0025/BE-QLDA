import { Injectable, HttpStatus, Inject } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ApiResponse } from '../../core/dto/ApiResponse.dto';
import { CustomException } from '../../core/exceptions/custom.exception';
import * as bcrypt from 'bcrypt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { LoginDto } from './dto/login.dto';
import { SendOtpDto } from './dto/otp.dto';
import { RegisterDto } from './dto/register.dto';
import { EUserRole } from '../users/enums/user.enum';
import { MailerService } from '@nestjs-modules/mailer';
import { ResetPasswordDto } from './dto/password.dto';
import { OtpPurpose } from './enums/otp.enum';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

const OTP_TTL = 10 * 60 * 1000;

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    @InjectRepository(User) private userRepository: Repository<User>,
    private readonly mailerService: MailerService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) { }

  async login(loginDto: LoginDto): Promise<ApiResponse<any>> {
    const { email, password } = loginDto;
    const user = await this.userRepository.findOne({
      where: { email },
      select: ['id', 'email', 'password', 'role', 'fullName', 'tokenVersion', 'phone', 'status', 'loyaltyPoints']
    });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw new CustomException(HttpStatus.UNAUTHORIZED, 'AUTH_FAILED', 'Tài khoản hoặc mật khẩu không đúng');
    }

    const payload = {
      userId: user.id,
      version: user.tokenVersion
    };

    const accessToken = this.jwtService.sign(payload);

    return new ApiResponse(true, 'Đăng nhập thành công', {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName || '',
        role: user.role,
        phone: user.phone || null,
        status: user.status,
        loyaltyPoints: user.loyaltyPoints
      }
    });
  }

  async register(registerDto: RegisterDto): Promise<ApiResponse<any>> {
    const { email, password, confirmPassword, otp } = registerDto;

    if (password !== confirmPassword) {
      throw new CustomException(HttpStatus.BAD_REQUEST, 'VALIDATION_FAILED', 'Mật khẩu xác nhận không khớp');
    }

    const record = await this.cacheManager.get<{ otp: string; expiresAt: number; purpose: OtpPurpose }>(email);
    if (!record) {
      throw new CustomException(HttpStatus.BAD_REQUEST, 'OTP_NOT_FOUND', 'Mã OTP không tồn tại hoặc chưa được gửi');
    }
    if (Date.now() > record.expiresAt) {
      await this.cacheManager.del(email);
      throw new CustomException(HttpStatus.BAD_REQUEST, 'OTP_EXPIRED', 'Mã OTP đã hết hạn');
    }
    if (record.otp !== otp) {
      throw new CustomException(HttpStatus.BAD_REQUEST, 'OTP_INVALID', 'Mã OTP không chính xác');
    }
    if (record.purpose !== OtpPurpose.REGISTER) {
      throw new CustomException(HttpStatus.BAD_REQUEST, 'OTP_INVALID_PURPOSE', 'Mã OTP không hợp lệ cho thao tác đăng ký');
    }
    await this.cacheManager.del(email);

    const existingUser = await this.userRepository.findOne({ where: { email } });
    if (existingUser) {
      throw new CustomException(HttpStatus.BAD_REQUEST, 'USER_EXISTS', 'Email đã được sử dụng');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = this.userRepository.create({
      email,
      password: hashedPassword,
      fullName: email.split('@')[0],
      role: EUserRole.CUSTOMER,
    });

    const savedUser = await this.userRepository.save(newUser);

    const payload = {
      userId: savedUser.id,
      version: savedUser.tokenVersion
    };

    const accessToken = this.jwtService.sign(payload);

    return new ApiResponse(true, 'Đăng ký thành công', {
      accessToken,
      user: {
        id: savedUser.id,
        email: savedUser.email,
        fullName: savedUser.fullName || '',
        role: savedUser.role,
        status: savedUser.status,
        loyaltyPoints: savedUser.loyaltyPoints
      }
    });
  }

  async sendOtp(dto: SendOtpDto): Promise<ApiResponse<null>> {
    const { email } = dto;
    const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + OTP_TTL;

    await this.cacheManager.set(email, { otp: generatedOtp, expiresAt, purpose: dto.purpose }, OTP_TTL + 5 * 60 * 1000);

    if (dto.purpose === OtpPurpose.REGISTER) {
      const existingUser = await this.userRepository.findOne({ where: { email } });
      if (existingUser) {
        return new ApiResponse(false, 'Email đã được sử dụng', null);
      }
    } else if (dto.purpose === OtpPurpose.FORGOT_PASSWORD) {
      const existingUser = await this.userRepository.findOne({ where: { email } });
      if (!existingUser) {
        return new ApiResponse(false, 'Email không tồn tại', null);
      }
    }

    try {
      const subject = dto.purpose === OtpPurpose.REGISTER ? 'Mã OTP đăng ký - QLDA' : 'Mã OTP quên mật khẩu - QLDA';
      const text = `Chào bạn, đây là mã xác thực để truy cập vào QLDA: ${generatedOtp}. Mã này có hiệu lực trong 10 phút. Vui lòng không chia sẻ mã này cho bất kỳ ai.`;
      const html = `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 500px; margin: 0 auto; border: 1px solid #eeeeee; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
          <div style="background-color: #2d89ef; padding: 20px; text-align: center;">
            <h2 style="color: #ffffff; margin: 0; font-size: 24px;">Xác thực QLDA</h2>
          </div>
          
          <div style="padding: 30px; line-height: 1.6; color: #333333; text-align: center;">
            <p style="margin-top: 0; font-size: 16px;">Chào bạn, đây là mã xác thực để truy cập vào QLDA:</p>
            
            <div style="background-color: #f0f7ff; border: 1px dashed #2d89ef; padding: 15px; margin: 20px 0; border-radius: 8px;">
              <span style="font-size: 32px; font-weight: bold; color: #2d89ef; letter-spacing: 5px;">${generatedOtp}</span>
            </div>
            
            <p style="font-size: 14px; color: #777777; margin-bottom: 0;">
              Mã này có hiệu lực trong <b style="color: #333;">10 phút</b>.<br>
              Vui lòng không chia sẻ mã này cho bất kỳ ai.
            </p>
          </div>
          
          <div style="background-color: #fafafa; padding: 15px; text-align: center; border-top: 1px solid #eeeeee;">
            <span style="font-size: 12px; color: #aaaaaa;">&copy; 2026 QLDA Team. All rights reserved.</span>
          </div>
        </div>
      `;
      await this.mailerService.sendMail({
        to: email,
        subject: subject,
        text: text,
        html: html,
      });
    } catch (error) {
      console.error('Mail send error:', error);
      return new ApiResponse(false, 'Không thể gửi email OTP, vui lòng thử lại sau.', null);
    }

    return new ApiResponse(true, 'Gửi OTP thành công', null);
  }

  async verifyOtp(dto: ResetPasswordDto): Promise<ApiResponse<null>> {
    const { email, otp } = dto;
    const record = await this.cacheManager.get<{ otp: string; expiresAt: number; purpose: OtpPurpose }>(email);
    if (!record) {
      return new ApiResponse(false, 'Mã OTP không tồn tại hoặc chưa được gửi', null);
    }
    if (Date.now() > record.expiresAt) {
      await this.cacheManager.del(email);
      return new ApiResponse(false, 'Mã OTP đã hết hạn', null);
    }
    if (record.otp !== otp) {
      return new ApiResponse(false, 'Mã OTP không chính xác', null);
    }
    if (record.purpose !== OtpPurpose.FORGOT_PASSWORD) {
      return new ApiResponse(false, 'Mã OTP không hợp lệ cho thao tác lấy lại mật khẩu', null);
    }
    return new ApiResponse(true, 'Xác thực OTP hợp lệ', null);
  }

  async forgotPassword(dto: ResetPasswordDto): Promise<ApiResponse<null>> {
    const { email, otp, confirmPassword } = dto;
    const record = await this.cacheManager.get<{ otp: string; expiresAt: number; purpose: OtpPurpose }>(email);
    if (!record || record.otp !== otp || record.purpose !== OtpPurpose.FORGOT_PASSWORD || Date.now() > record.expiresAt) {
      return new ApiResponse(false, 'Mã OTP không hợp lệ hoặc đã hết hạn', null);
    }

    await this.cacheManager.del(email);
    const hashedPassword = await bcrypt.hash(confirmPassword, 10);
    await this.userRepository.update({ email }, { password: hashedPassword });

    return new ApiResponse(true, 'Đặt lại mật khẩu thành công', null);
  }

  async logout(userId: number): Promise<ApiResponse<null>> {
    await this.userRepository.increment({ id: userId }, 'tokenVersion', 1);
    return new ApiResponse(true, 'Đăng xuất thành công', null);
  }
}