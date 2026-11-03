import { Module } from '@nestjs/common';
import { CustomersService } from './customers.service';
import { CustomersController } from './customers.controller';
import { AuthModule } from '../../auth/auth.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { CustomerSegmentsController } from './customer-segments.controller';
import { CustomerSegmentsService } from './customer-segments.service';
import { CustomerSegmentsOverviewController } from './customer-segments-overview.controller';

@Module({
  imports: [AuthModule, PrismaModule],
  providers: [CustomersService, CustomerSegmentsService],
  controllers: [CustomersController, CustomerSegmentsController, CustomerSegmentsOverviewController],
  exports: [CustomersService],
})
export class CustomersModule {}
