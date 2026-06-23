import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { ENV_VARS } from 'src/constants/env.constants';
import { DataSource } from 'typeorm';
import { User } from 'src/module/users/entities/user.entity';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private dataSource: DataSource,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) => {
          return request?.cookies?.accessToken || null;
        },
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>(ENV_VARS.JWT_ACCESS_SECRET) as string,
    });
  }

  async validate(payload: any) {
    const userRepository = this.dataSource.getRepository(User);
    const user = await userRepository.findOne({ where: { id: payload.userId } });

    // Nếu không tìm thấy user hoặc version trong token không khớp với DB -> Token hết hạn/Logout
    if (!user || user.tokenVersion !== payload.version) {
      throw new UnauthorizedException('Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại');
    }

    return user;
  }
}