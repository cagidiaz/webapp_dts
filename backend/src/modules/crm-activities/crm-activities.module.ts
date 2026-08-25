import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { CrmActivitiesController } from './crm-activities.controller';
import { CrmActivitiesService } from './crm-activities.service';
import { ExchangeSyncModule } from '../exchange-sync/exchange-sync.module';

@Module({
  imports: [PrismaModule, forwardRef(() => ExchangeSyncModule)],
  controllers: [CrmActivitiesController],
  providers: [CrmActivitiesService],
  exports: [CrmActivitiesService]
})
export class CrmActivitiesModule {}
