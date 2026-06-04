import { Module } from '@nestjs/common';
import { SalesDocumentsController } from './sales-documents.controller';
import { SalesDocumentsService } from './sales-documents.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [SalesDocumentsController],
  providers: [SalesDocumentsService],
  exports: [SalesDocumentsService],
})
export class SalesDocumentsModule {}
