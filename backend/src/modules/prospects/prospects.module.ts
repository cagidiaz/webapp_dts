import { Module } from '@nestjs/common';
import { ProspectsController } from './prospects.controller';
import { ProspectsService } from './prospects.service';
import { ExchangeSyncModule } from '../exchange-sync/exchange-sync.module';

@Module({ imports: [ExchangeSyncModule], controllers: [ProspectsController], providers: [ProspectsService], exports: [ProspectsService] })
export class ProspectsModule {}
