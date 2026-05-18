/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/require-await */
import { Injectable, ExecutionContext, HttpStatus } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { CustomException } from '../../exceptions/custom.exception';

@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  protected async throwThrottlingException(
    context: ExecutionContext,
    throttlerLimitDetail: any,
  ): Promise<void> {
    throw new CustomException(
      HttpStatus.TOO_MANY_REQUESTS,
      'TOO_MANY_REQUESTS',
      'Yêu cầu quá nhiều lần, vui lòng thử lại sau.',
    );
  }
}
