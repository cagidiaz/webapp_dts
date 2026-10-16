import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Req, UseGuards } from '@nestjs/common';
import { IsIn, IsOptional, IsString, IsUUID, Matches, MaxLength } from 'class-validator';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { OutlookClassicService } from './outlook-classic.service';

class PairStartDto {
  @IsString() @MaxLength(700) n: string;
  @IsIn(['AQAB']) e: string;
  @Matches(/^[A-Za-z0-9_-]{43}$/) clientNonce: string;
  @IsString() @MaxLength(800) signature: string;
  @IsString() @MaxLength(80) label: string;
}
class PairApproveDto {
  @IsUUID() pairingId: string;
  @IsString() @MaxLength(32) code: string;
}
class PairPollDto { @Matches(/^[A-Za-z0-9_-]{43}$/) secret: string; }
class ClassicCreateDto {
  @IsOptional() @IsIn(['open','reply','reply_all']) action?: 'open' | 'reply' | 'reply_all';
  @IsUUID() activityId: string;
  @IsUUID() deviceId: string;
  @IsOptional() @IsString() @MaxLength(32768) candidateId?: string;
}
class ProofDto {
  @IsUUID() deviceId: string;
  @Matches(/^[A-Za-z0-9_-]{43}$/) token: string;
  @Matches(/^\d{13}$/) timestamp: string;
  @Matches(/^[A-Za-z0-9_-]{43}$/) nonce: string;
  @IsString() @MaxLength(24) version: string;
  @IsString() @MaxLength(800) signature: string;
}
class ResultDto extends ProofDto {
  @IsIn(['opened','not_found','mailbox_not_available','identity_mismatch','classic_not_available','error']) outcome: string;
  @Matches(/^[A-Za-z0-9_-]{43}$/) claimNonce: string;
}

@Controller('exchange-sync/classic')
export class OutlookClassicController {
  constructor(private readonly classic: OutlookClassicService) {}
  // No Microsoft/CRM tokens are accepted here: enrollment secrets and device signatures are checked by the service.
  @Post('pair/start') start(@Body() body: PairStartDto, @Req() req: any) { return this.classic.startPair(body, req.ip || 'unknown'); }
  @Post('pair/:id/poll') poll(@Param('id', ParseUUIDPipe) id: string, @Body() body: PairPollDto) { return this.classic.pairStatus(id, body.secret); }
  @Post('pair/approve') @UseGuards(JwtAuthGuard) approve(@Req() req: any, @Body() body: PairApproveDto) { return this.classic.approvePair(req.user.userId, body.pairingId, body.code); }
  @Get('devices') @UseGuards(JwtAuthGuard) devices(@Req() req: any) { return this.classic.devices(req.user.userId); }
  @Post('devices/:id/revoke') @UseGuards(JwtAuthGuard) revoke(@Req() req: any, @Param('id', ParseUUIDPipe) id: string) { return this.classic.revoke(req.user.userId, id); }
  @Post('requests') @UseGuards(JwtAuthGuard) create(@Req() req: any, @Body() body: ClassicCreateDto) { return this.classic.create(req.user.userId, body.activityId, body.deviceId, body.candidateId, body.action); }
  @Get('requests/:id') @UseGuards(JwtAuthGuard) status(@Req() req: any, @Param('id', ParseUUIDPipe) id: string) { return this.classic.status(req.user.userId, id); }
  @Post('requests/:id/claim') claim(@Param('id', ParseUUIDPipe) id: string, @Body() body: ProofDto) { return this.classic.claim(id, body); }
  @Post('requests/:id/result') result(@Param('id', ParseUUIDPipe) id: string, @Body() body: ResultDto) { return this.classic.result(id, body, body.outcome, body.claimNonce); }
}
