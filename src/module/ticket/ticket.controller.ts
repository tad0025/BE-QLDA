import {
  Controller, Get, Post, Put, Delete, Body, Param,
  ParseIntPipe, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { TicketService } from './ticket.service';
import { CreateTicketPriceDto, UpdateTicketPriceDto, BulkCreateTicketPriceDto } from './dto/ticket-price.dto';
import { JwtAuthGuard } from '../../core/security/jwt/jwt-auth.guard';
import { RolesGuard } from '../../core/security/roles/roles.guard';
import { Roles } from '../../core/security/roles/roles.decorator';
import { EUserRole } from '../users/enums/user.enum';

@Controller('tickets')
export class TicketController {
  constructor(private readonly ticketService: TicketService) {}

  // ─── TICKET PRICE ─────────────────────────────────────────────────────

  @Post('prices')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(EUserRole.ADMIN, EUserRole.STAFF)
  @HttpCode(HttpStatus.CREATED)
  async createTicketPrice(@Body() dto: CreateTicketPriceDto) {
    return this.ticketService.createTicketPrice(dto);
  }

  @Post('prices/bulk')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(EUserRole.ADMIN, EUserRole.STAFF)
  @HttpCode(HttpStatus.CREATED)
  async bulkCreateTicketPrices(@Body() dto: BulkCreateTicketPriceDto) {
    return this.ticketService.bulkCreateTicketPrices(dto);
  }

  @Get('prices')
  @HttpCode(HttpStatus.OK)
  async getTicketPrices() {
    return this.ticketService.getTicketPrices();
  }

  @Put('prices/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(EUserRole.ADMIN, EUserRole.STAFF)
  @HttpCode(HttpStatus.OK)
  async updateTicketPrice(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTicketPriceDto,
  ) {
    return this.ticketService.updateTicketPrice(id, dto);
  }

  @Delete('prices/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(EUserRole.ADMIN, EUserRole.STAFF)
  @HttpCode(HttpStatus.OK)
  async deleteTicketPrice(@Param('id', ParseIntPipe) id: number) {
    return this.ticketService.deleteTicketPrice(id);
  }
}
