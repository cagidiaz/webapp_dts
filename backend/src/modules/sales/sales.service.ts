import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SalesService {
  constructor(private readonly prisma: PrismaService) {}

  async getSalesBudgets(year?: number) {
    try {
      const targetYear = year || new Date().getFullYear();
      
      // Calculate start and end of the target year
      const startDate = new Date(`${targetYear}-01-01T00:00:00.000Z`);
      const endDate = new Date(`${targetYear}-12-31T23:59:59.999Z`);

      const budgets = await this.prisma.salesBudget.groupBy({
        by: ['budgetDate'],
        _sum: {
          monthlyBudget: true,
        },
        where: {
          budgetDate: {
            gte: startDate,
            lte: endDate,
          },
        },
      });

      // Sum all monthly budgets for the year
      const totalBudget = budgets.reduce((acc: number, current: any) => {
        return acc + (current._sum.monthlyBudget ? Number(current._sum.monthlyBudget) : 0);
      }, 0);

      return {
        year: targetYear,
        totalSalesBudget: totalBudget,
      };
    } catch (error) {
       throw new InternalServerErrorException(error.message);
    }
  }
}
