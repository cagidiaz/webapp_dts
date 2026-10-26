import { Module } from '@nestjs/common';
import { CustomersService } from './customers.service';
import { CustomersController } from './customers.controller';
import { AuthModule } from '../../auth/auth.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { CustomerSegmentsController } from './customer-segments.controller';
import { CustomerSegmentsService } from './customer-segments.service';

@Module({
  imports: [AuthModule, PrismaModule],
  providers: [CustomersService, CustomerSegmentsService],
  controllers: [CustomersController, CustomerSegmentsController],
  exports: [CustomersService],
})
export class CustomersModule {}
