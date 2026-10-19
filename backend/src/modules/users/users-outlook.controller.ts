import { Controller, Get, Param, ParseUUIDPipe, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { UsersOutlookService } from './users-outlook.service';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users/outlook')
export class UsersOutlookController {
  constructor(private readonly outlook: UsersOutlookService) {}
  @Get()
  @ApiOperation({ summary: 'Consultar vinculaciones Outlook de todos los usuarios (solo ADMIN activo)' })
  list(@Req() req: any) { return this.outlook.list(req.user.userId); }
  @Post('devices/:id/revoke')
  @ApiOperation({ summary: 'Revocar una vinculación Classic (solo ADMIN activo)' })
  revoke(@Req() req: any, @Param('id', ParseUUIDPipe) id: string) { return this.outlook.revoke(req.user.userId, id); }
}
