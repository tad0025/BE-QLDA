import {
  Controller, Get, Post, Put, Delete, Body, Param,
  ParseIntPipe, Query, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ConcessionService } from './concession.service';
import { CreateConcessionProductDto, UpdateConcessionProductDto } from './dto/concession.dto';
import { JwtAuthGuard } from '../../core/security/jwt/jwt-auth.guard';
import { RolesGuard } from '../../core/security/roles/roles.guard';
import { Roles } from '../../core/security/roles/roles.decorator';
import { EUserRole } from '../users/enums/user.enum';

@Controller('concessions')
export class ConcessionController {
  constructor(private readonly concessionService: ConcessionService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(EUserRole.ADMIN, EUserRole.STAFF)
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateConcessionProductDto) {
    return this.concessionService.create(dto);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll(
    @Query('page') page: number = 1,
    @Query('pageSize') pageSize: number = 10,
  ) {
    return this.concessionService.findAll(page, pageSize);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.concessionService.findOne(id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(EUserRole.ADMIN, EUserRole.STAFF)
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateConcessionProductDto,
  ) {
    return this.concessionService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(EUserRole.ADMIN, EUserRole.STAFF)
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.concessionService.remove(id);
  }
}
