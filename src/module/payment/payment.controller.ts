import { Controller, Post, Body, UseGuards, HttpCode, HttpStatus, Request } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { MockPaymentDto } from './dto/payment.dto';
import { JwtAuthGuard } from '../../core/security/jwt/jwt-auth.guard';

@Controller('payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('mock-payment')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async mockPayment(@Request() req, @Body() dto: MockPaymentDto) {
    return this.paymentService.mockPayment(req.user.id, dto);
  }
}
