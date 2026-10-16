import { OutlookClassicController } from './outlook-classic.controller';
import { EmailReplyService } from './email-reply.service';
import { OutlookClassicService } from './outlook-classic.service';
import { EmailOpenController } from './email-open.controller';
import { EmailOpenService } from './email-open.service';
import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../../auth/auth.module';
import { MicrosoftGraphService } from './microsoft-graph.service';
import { ExchangeSyncService } from './exchange-sync.service';
import { ExchangeSyncController } from './exchange-sync.controller';
import { OutlookAddinController } from './outlook-addin.controller';
import { OutlookAddinService } from './outlook-addin.service';
import { EmailIdentityService } from './email-identity.service';
import { OutlookAddinAccessService } from './outlook-addin-access.service';
import { ProspectOutlookService } from './prospect-outlook.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [ExchangeSyncController, OutlookAddinController, EmailOpenController, OutlookClassicController],
  providers: [EmailReplyService, OutlookClassicService, EmailOpenService, MicrosoftGraphService, ExchangeSyncService, OutlookAddinService, ProspectOutlookService, EmailIdentityService, OutlookAddinAccessService],
  exports: [MicrosoftGraphService, ExchangeSyncService, OutlookAddinService, ProspectOutlookService, EmailIdentityService, OutlookAddinAccessService],
})
export class ExchangeSyncModule {}
