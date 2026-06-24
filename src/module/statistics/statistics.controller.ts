import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { StatisticsService } from './statistics.service';
import { JwtAuthGuard } from '../../core/security/jwt/jwt-auth.guard';
import { RolesGuard } from '../../core/security/roles/roles.guard';
import { Roles } from '../../core/security/roles/roles.decorator';
import { EUserRole } from '../users/enums/user.enum';


@Controller('statistics')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(EUserRole.ADMIN)
export class StatisticsController {
  constructor(private readonly statisticsService: StatisticsService) {}

  @Get('revenue')
  async getRevenueStatistics(
    @Query('timeFrame') timeFrame: 'day' | 'week' | 'month' | 'year' = 'month',
    @Query('year') year?: string,
    @Query('month') month?: string,
  ) {
    const parsedYear = year ? parseInt(year, 10) : undefined;
    const parsedMonth = month ? parseInt(month, 10) : undefined;
    return this.statisticsService.getRevenueStatistics(timeFrame, parsedYear, parsedMonth);
  }

  @Get('movies')
  async getMoviePerformance() {
    return this.statisticsService.getMoviePerformance();
  }

  @Get('summary')
  async getSummary() {
    return this.statisticsService.getSummary();
  }
}
