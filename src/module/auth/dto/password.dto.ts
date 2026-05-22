import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';

export function Match(property: string, validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'match',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [property],
      validator: {
        validate(value: any, args: ValidationArguments) {
          const [relatedPropertyName] = args.constraints;
          const relatedValue = (args.object as any)[relatedPropertyName];
          return value === relatedValue;
        },
      },
    });
  };
}

export class ResetPasswordDto {
  @IsEmail({}, { message: 'Email không hợp lệ' })
  @IsNotEmpty({ message: 'Vui lòng nhập email' })
  email: string;

  @IsNotEmpty({ message: 'Vui lòng nhập mã OTP' })
  @IsString()
  otp: string;

  @IsNotEmpty({ message: 'Vui lòng nhập mật khẩu mới' })
  @IsString()
  newPassword: string;

  @IsNotEmpty({ message: 'Vui lòng nhập mật khẩu xác nhận' })
  @IsString()
  @Match('newPassword', { message: 'Mật khẩu xác nhận không khớp' })
  confirmPassword: string;
}

export class ChangePasswordDto {
  @IsNotEmpty({ message: 'Vui long nhap mat khau cu' })
  @IsString()
  oldPassword: string;

  @IsNotEmpty({ message: 'Vui long nhap mat khau moi' })
  @IsString()
  @MinLength(6, { message: 'Mat khau moi toi thieu 6 ky tu' })
  newPassword: string;

  @IsNotEmpty({ message: 'Vui long nhap xac nhan mat khau moi' })
  @IsString()
  @Match('newPassword', { message: 'Mat khau xac nhan khong khop' })
  confirmPassword: string;
}
