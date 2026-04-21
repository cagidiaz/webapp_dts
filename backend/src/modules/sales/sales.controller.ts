import { Controller, Get, UseGuards, Query, Req, UnauthorizedException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SalesService } from './sales.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { PrismaService } from '../../prisma/prisma.service';

@ApiTags('sales')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('sales')
export class SalesController {
  constructor(
    private readonly salesService: SalesService,
    private readonly prisma: PrismaService
  ) {}

  private async getSalespersonCode(req: any, queryCode?: string) {
    const userId = req.user?.userId;
    if (!userId) throw new UnauthorizedException('User not authenticated');
    
    // Check local profile first
    const profile = await this.prisma.profiles.findUnique({
      where: { id: userId }
    });

    if (profile?.code) {
      // Si el perfil tiene código, forzar ese código de vendedor (ignorar query)
      return profile.code;
    }
    // Si no tiene código, usar el filtro de la query si se proporciona
    return queryCode || undefined;
  }

  @Get('budgets')
  @ApiOperation({ summary: 'Get aggregated sales budgets by year' })
  async getSalesBudgets(@Query('year') year?: number) {
    return this.salesService.getSalesBudgets(year ? Number(year) : undefined);
  }

  @Get('budget-performance')
  @ApiOperation({ summary: 'Get sales budget performance data and KPIs' })
  async getBudgetPerformance(
    @Req() req: any,
    @Query('year') year: string,
    @Query('months') months?: string,
    @Query('salespersonCode') salespersonCode?: string,
    @Query('familyCode') familyCode?: string,
    @Query('subfamilyCode') subfamilyCode?: string,
    @Query('customerCode') customerCode?: string,
    @Query('search') search?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortDir') sortDir?: 'asc' | 'desc',
    @Query('take') take?: string,
    @Query('skip') skip?: string,
  ) {
    const targetYear = year ? Number(year) : new Date().getFullYear();

    let targetMonths;
    if (months) {
      targetMonths = months.split(',').map(m => Number(m.trim())).filter(m => !isNaN(m));
    }
    const code = await this.getSalespersonCode(req, salespersonCode);

    return this.salesService.getSalesBudgetPerformance({
      year: targetYear,
      months: targetMonths,
      salespersonCode: code,
      customerCode,
      familyCode,
      subfamilyCode,
      search,
      sortBy,
      sortDir,
      take: take ? Number(take) : undefined,
      skip: skip ? Number(skip) : undefined
    });
  }


  @Get('budget-evolution')
  @ApiOperation({ summary: 'Get monthly evolution data of sales vs budget' })
  async getBudgetEvolution(
    @Req() req: any,
    @Query('year') year: string,
    @Query('salespersonCode') salespersonCode?: string,
    @Query('familyCode') familyCode?: string,
    @Query('subfamilyCode') subfamilyCode?: string,
    @Query('customerCode') customerCode?: string,
    @Query('search') search?: string,
  ) {
    const targetYear = year ? Number(year) : new Date().getFullYear();

    const code = await this.getSalespersonCode(req, salespersonCode);


    return this.salesService.getSalesBudgetEvolution({
      year: targetYear,
      salespersonCode: code,
      customerCode,
      search,
      familyCode,
      subfamilyCode
    });
  }


  @Get('top-products')
  @ApiOperation({ summary: 'Get best selling products ranking' })
  async getTopProducts(
    @Req() req: any,
    @Query('year') year: string,
    @Query('take') take?: string,
    @Query('salespersonCode') salespersonCode?: string,
  ) {
    const targetYear = year ? Number(year) : new Date().getFullYear();
    const code = await this.getSalespersonCode(req, salespersonCode);
    return this.salesService.getTopProducts({
      year: targetYear,
      salespersonCode: code,
      take: take ? Number(take) : undefined
    });
  }

  @Get('pm-codes')
  @ApiOperation({ summary: 'Get unique Product Manager codes' })
  async getPmCodes() {
    return this.salesService.getPmCodes();
  }

  @Get('product-budget-performance')
  @ApiOperation({ summary: 'Get product-level budget performance data (hierarchical)' })
  async getProductBudgetPerformance(
    @Req() req: any,
    @Query('year') year: string,
    @Query('months') months?: string,
    @Query('salespersonCode') salespersonCode?: string,
    @Query('pmCode') pmCode?: string,
    @Query('familyCode') familyCode?: string,
    @Query('subfamilyCode') subfamilyCode?: string,
    @Query('search') search?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortDir') sortDir?: 'asc' | 'desc',
    @Query('take') take?: string,
    @Query('skip') skip?: string,
  ) {
    const targetYear = year ? Number(year) : new Date().getFullYear();
    let targetMonths;
    if (months) {
      targetMonths = months.split(',').map(m => Number(m.trim())).filter(m => !isNaN(m));
    }

    return this.salesService.getProductBudgetPerformance({
      year: targetYear,
      months: targetMonths,
      salespersonCode: salespersonCode || undefined,
      pmCode,
      familyCode,
      subfamilyCode,
      search,
      sortBy,
      sortDir,
      take: take ? Number(take) : undefined,
      skip: skip ? Number(skip) : undefined,
    });
  }

  @Get('product-budget-evolution')
  @ApiOperation({ summary: 'Get monthly evolution for product budget view' })
  async getProductBudgetEvolution(
    @Req() req: any,
    @Query('year') year: string,
    @Query('salespersonCode') salespersonCode?: string,
    @Query('pmCode') pmCode?: string,
    @Query('familyCode') familyCode?: string,
    @Query('subfamilyCode') subfamilyCode?: string,
    @Query('search') search?: string,
  ) {
    const targetYear = year ? Number(year) : new Date().getFullYear();

    return this.salesService.getProductBudgetEvolution({
      year: targetYear,
      salespersonCode: salespersonCode || undefined,
      pmCode,
      familyCode,
      subfamilyCode,
      search,
    });
  }
}
