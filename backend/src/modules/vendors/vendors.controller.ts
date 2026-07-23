import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { VendorsService } from './vendors.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';

@Controller('vendors')
@UseGuards(JwtAuthGuard)
export class VendorsController {
  constructor(private readonly vendorsService: VendorsService) {}

  @Get()
  async getAll(
    @Query('skip') skip?: string,
    @Query('take') take?: string,
    @Query('search') search?: string,
    @Query('blocked') blocked?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortDir') sortDir?: 'asc' | 'desc',
  ) {
    const isBlocked = blocked === undefined || blocked === '' ? undefined : blocked === 'true';
    return this.vendorsService.getAll({
      skip: skip ? parseInt(skip, 10) : undefined,
      take: take ? parseInt(take, 10) : undefined,
      search,
      blocked: isBlocked,
      sortBy,
      sortDir,
    });
  }

  @Get(':id')
  async getById(@Param('id') id: string) {
    return this.vendorsService.getById(id);
  }

  @Get('code/:vendorId')
  async getByVendorId(@Param('vendorId') vendorId: string) {
    return this.vendorsService.getByVendorId(vendorId);
  }
}
