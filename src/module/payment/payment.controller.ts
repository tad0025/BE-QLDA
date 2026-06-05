import { Controller, Post, Body, UseGuards, HttpCode, HttpStatus, Request } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { ConfirmPaymentDto } from './dto/payment.dto';
import { JwtAuthGuard } from '../../core/security/jwt/jwt-auth.guard';

@Controller('payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('confirm')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async confirmPayment(@Request() req, @Body() dto: ConfirmPaymentDto) {
    return this.paymentService.confirmPayment(req.user.id, dto);
  }
}
