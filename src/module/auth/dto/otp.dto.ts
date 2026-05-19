import { IsEmail, IsEnum } from 'class-validator';
import { OtpPurpose } from '../enums/otp.enum';

export class SendOtpDto {
  @IsEmail()
  email: string;

  @IsEnum(OtpPurpose)
  purpose: OtpPurpose;
}