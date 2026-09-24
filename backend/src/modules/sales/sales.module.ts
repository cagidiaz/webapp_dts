import { Module } from '@nestjs/common';
import { SalesController } from './sales.controller';
import { SalesService } from './sales.service';
import { BudgetGeneratorService } from './budget-generator.service';
import { AuthModule } from '../../auth/auth.module';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [SalesController],
  providers: [SalesService, BudgetGeneratorService],
})
export class SalesModule {}
