import { Body, Controller, Param, ParseUUIDPipe, Post, Req, UseGuards } from '@nestjs/common';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { EmailOpenService } from './email-open.service';

class ResolveEmailDto {
  @IsOptional() @IsString() @MaxLength(32768)
  candidateId?: string;
}

@Controller('exchange-sync/emails')
@UseGuards(JwtAuthGuard)
export class EmailOpenController {
  constructor(private readonly emails: EmailOpenService) {}
  @Post(':activityId/resolve')
  resolve(@Req() req: any, @Param('activityId', ParseUUIDPipe) id: string, @Body() body: ResolveEmailDto) {
    return this.emails.resolve(req.user.userId, id, body.candidateId);
  }
}
