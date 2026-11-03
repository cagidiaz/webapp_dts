import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { CustomerSegmentsService } from './customer-segments.service';

@Controller('crm/customer-segments')
@UseGuards(JwtAuthGuard)
export class CustomerSegmentsOverviewController {
  constructor(private readonly service: CustomerSegmentsService) {}

  @Get()
  overview(@Req() req: { user: { userId: string } }) {
    return this.service.overview(req.user.userId);
  }
}
