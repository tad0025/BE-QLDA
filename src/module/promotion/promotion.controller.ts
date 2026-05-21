import {
  Controller, Get, Post, Put, Delete, Body, Param,
  ParseIntPipe, Query, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { PromotionService } from './promotion.service';
import { CreatePromotionDto, UpdatePromotionDto, CheckPromotionDto } from './dto/promotion.dto';
import { JwtAuthGuard } from '../../core/security/jwt/jwt-auth.guard';
import { RolesGuard } from '../../core/security/roles/roles.guard';
import { Roles } from '../../core/security/roles/roles.decorator';
import { EUserRole } from '../users/enums/user.enum';

@Controller('promotions')
export class PromotionController {
  constructor(private readonly promotionService: PromotionService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(EUserRole.ADMIN, EUserRole.STAFF)
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreatePromotionDto) {
    return this.promotionService.create(dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(EUserRole.ADMIN, EUserRole.STAFF)
  @HttpCode(HttpStatus.OK)
  async findAll(
    @Query('page') page: number = 1,
    @Query('pageSize') pageSize: number = 10,
  ) {
    return this.promotionService.findAll(page, pageSize);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(EUserRole.ADMIN, EUserRole.STAFF)
  @HttpCode(HttpStatus.OK)
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.promotionService.findOne(id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(EUserRole.ADMIN, EUserRole.STAFF)
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePromotionDto,
  ) {
    return this.promotionService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(EUserRole.ADMIN, EUserRole.STAFF)
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.promotionService.remove(id);
  }

  @Post('check-promotion')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async checkPromotion(@Body() dto: CheckPromotionDto) {
    return this.promotionService.checkPromotion(dto);
  }
}
