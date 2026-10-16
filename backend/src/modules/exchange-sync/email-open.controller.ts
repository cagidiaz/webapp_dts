import { Body, Controller, Param, ParseUUIDPipe, Post, Req, UseGuards } from '@nestjs/common';
import { IsOptional, IsString, MaxLength, IsIn } from 'class-validator';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { EmailOpenService } from './email-open.service';
import { EmailReplyService, type ReplyMode } from './email-reply.service';

class ResolveEmailDto {
  @IsOptional() @IsString() @MaxLength(32768)
  candidateId?: string;
}

class ReplyEmailDto extends ResolveEmailDto { @IsIn(['reply','reply_all']) mode: ReplyMode; }

@Controller('exchange-sync/emails')
@UseGuards(JwtAuthGuard)
export class EmailOpenController {
  constructor(private readonly emails: EmailOpenService, private readonly replies: EmailReplyService) {}
  @Post(':activityId/resolve')
  resolve(@Req() req: any, @Param('activityId', ParseUUIDPipe) id: string, @Body() body: ResolveEmailDto) {
    return this.emails.resolve(req.user.userId, id, body.candidateId);
  }
  @Post(':activityId/reply')
  reply(@Req() req: any, @Param('activityId', ParseUUIDPipe) id: string, @Body() body: ReplyEmailDto) {
    return this.replies.prepare(req.user.userId, id, body.mode, body.candidateId);
  }
}
