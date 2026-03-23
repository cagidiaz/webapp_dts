import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { AppService } from './app.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Health Check')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  @ApiOperation({ summary: 'Check API and Database health' })
  @ApiResponse({ status: 200, description: 'API is healthy' })
  @ApiResponse({ status: 503, description: 'Service is degraded' })
  async getHealth() {
    const health = await this.appService.getHealth();
    if (health.status !== 'UP') {
      throw new ServiceUnavailableException(health);
    }
    return health;
  }
}
