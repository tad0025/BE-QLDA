import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { HomeService } from './home.service';

@Controller('home')
export class HomeController {
  constructor(private readonly homeService: HomeService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async getHomePageData() {
    return this.homeService.getHomePageData();
  }
}
