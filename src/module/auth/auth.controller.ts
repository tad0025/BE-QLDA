import { Controller, Post, Body, HttpCode, HttpStatus, UseGuards, Request, Res } from '@nestjs/common';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ChangePasswordDto, ResetPasswordDto } from './dto/password.dto';
import { JwtAuthGuard } from 'src/core/security/jwt/jwt-auth.guard';
import { SendOtpDto } from './dto/otp.dto';
import { ConfigService } from '@nestjs/config';
import { ENV_VARS } from 'src/constants/env.constants';
import ms from 'ms';
import type { StringValue } from 'ms';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) { }

  @Post('login') // POST /auth/login 
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) res: Response
  ) {
    const result = await this.authService.login(loginDto);

    if (result.success && result.data?.accessToken) {
      const expiresStr = this.configService.get<StringValue>(ENV_VARS.JWT_ACCESS_EXPIRES_IN) || '7d';
      res.cookie('accessToken', result.data.accessToken, {
        httpOnly: true, // Chống XSS (JavaScript không đọc được)
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict', // Chống CSRF
        maxAge: ms(expiresStr),
      });
    }

    return result;
  }

  @Post('send-otp') // POST /auth/send-otp 
  @HttpCode(HttpStatus.OK)
  async sendOtp(@Body() dto: SendOtpDto) {
    return this.authService.sendOtp(dto);
  }

  @Post('register') // POST /auth/register 
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('forgot-password') // POST /auth/forgot-password
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-password') // POST /auth/change-password
  @HttpCode(HttpStatus.OK)
  async changePassword(@Request() req, @Body() dto: ChangePasswordDto) {
    return this.authService.changePassword(req.user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout') // POST /auth/logout 
  @HttpCode(HttpStatus.OK)
  async logout(
    @Request() req,
    @Res({ passthrough: true }) res: Response
  ) {
    const result = await this.authService.logout(req.user.id);

    res.clearCookie('accessToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });

    return result;
  }
}
