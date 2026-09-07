import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../../auth/auth.module';
import { MicrosoftGraphService } from './microsoft-graph.service';
import { ExchangeSyncService } from './exchange-sync.service';
import { ExchangeSyncController } from './exchange-sync.controller';
import { OutlookAddinController } from './outlook-addin.controller';
import { OutlookAddinService } from './outlook-addin.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [ExchangeSyncController, OutlookAddinController],
  providers: [MicrosoftGraphService, ExchangeSyncService, OutlookAddinService],
  exports: [MicrosoftGraphService, ExchangeSyncService, OutlookAddinService],
})
export class ExchangeSyncModule {}
