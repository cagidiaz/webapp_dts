import { Body, Controller, Delete, Get, Param, ParseIntPipe, Put, Query, Req, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { CustomerSegmentsService } from './customer-segments.service';
import { SaveCustomerSegmentDto } from './customer-segments.dto';

@Controller('customers/code/:clientCode/segments')
@UseGuards(JwtAuthGuard)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }))
export class CustomerSegmentsController {
  constructor(private readonly service: CustomerSegmentsService) {}

  @Get()
  list(@Req() req: any, @Param('clientCode') clientCode: string) {
    return this.service.list(req.user.userId, clientCode);
  }

  @Put(':segmentCode')
  save(@Req() req: any, @Param('clientCode') clientCode: string, @Param('segmentCode') segmentCode: string, @Body() data: SaveCustomerSegmentDto) {
    return this.service.save(req.user.userId, clientCode, segmentCode, data);
  }

  @Delete(':segmentCode')
  remove(@Req() req: any, @Param('clientCode') clientCode: string, @Param('segmentCode') segmentCode: string, @Query('version', ParseIntPipe) version: number) {
    return this.service.remove(req.user.userId, clientCode, segmentCode, version);
  }
}
