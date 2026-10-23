import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { DocumentationController } from './documentation.controller';
import { DocumentationService } from './documentation.service';

@Module({ imports: [AuthModule, PrismaModule], controllers: [DocumentationController], providers: [DocumentationService] })
export class DocumentationModule {}
