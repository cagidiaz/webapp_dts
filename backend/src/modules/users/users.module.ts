import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { AuthModule } from '../../auth/auth.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { UsersOutlookController } from './users-outlook.controller';
import { UsersOutlookService } from './users-outlook.service';

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [UsersController, UsersOutlookController],
  providers: [UsersService, UsersOutlookService],
})
export class UsersModule {}


