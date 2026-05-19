import { Module } from '@nestjs/common';
import { MailerModule } from '@nestjs-modules/mailer';
import { ConfigService } from '@nestjs/config';
import { ENV_VARS } from 'src/constants/env.constants';

@Module({
  imports: [
    MailerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        transport: {
          host: config.get<string>(ENV_VARS.MAIL_HOST),
          port: config.get<number>(ENV_VARS.MAIL_PORT),
          secure: config.get<number>(ENV_VARS.MAIL_PORT) === 465,
          auth: {
            user: config.get<string>(ENV_VARS.MAIL_USER),
            pass: config.get<string>(ENV_VARS.MAIL_PASS),
          },
        },
        defaults: {
          from: config.get<string>(ENV_VARS.MAIL_FROM),
        },
      }),
    }),
  ],
  exports: [MailerModule],
})
export class MailModule {}
