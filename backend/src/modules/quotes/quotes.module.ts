import { Module } from '@nestjs/common';
import { QuotesService } from './quotes.service';
import { QuotesController } from './quotes.controller';
import { ProspectsModule } from '../prospects/prospects.module';
import { OfferFollowupService } from './offer-followup.service';
import { PipelineCutsController } from './pipeline-cuts.controller';
import { PipelineCutsService } from './pipeline-cuts.service';

@Module({
  imports: [ProspectsModule],
  controllers: [QuotesController, PipelineCutsController],
  providers: [QuotesService, OfferFollowupService, PipelineCutsService],
  exports: [QuotesService],
})
export class QuotesModule {}
