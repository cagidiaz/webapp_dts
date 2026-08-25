import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../../auth/auth.module';
import { MicrosoftGraphService } from './microsoft-graph.service';
import { ExchangeSyncService } from './exchange-sync.service';
import { ExchangeSyncController } from './exchange-sync.controller';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [ExchangeSyncController],
  providers: [MicrosoftGraphService, ExchangeSyncService],
  exports: [MicrosoftGraphService, ExchangeSyncService],
})
export class ExchangeSyncModule {}
