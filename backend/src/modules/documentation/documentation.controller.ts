import { Controller, Get, Header, Param, Query, Req, StreamableFile, UseGuards } from '@nestjs/common';
import { createReadStream } from 'node:fs';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { DocumentationService } from './documentation.service';

@Controller('documentation/manuals')
@UseGuards(JwtAuthGuard)
export class DocumentationController {
  constructor(private readonly documentation: DocumentationService) {}

  @Get()
  @Header('Cache-Control', 'private, no-store')
  list(@Req() req: any) { return this.documentation.list(req.user.userId); }

  @Get(':id/pdf')
  @Header('Cache-Control', 'private, no-store')
  @Header('X-Content-Type-Options', 'nosniff')
  async pdf(@Req() req: any, @Param('id') id: string, @Query('download') download?: string) {
    const file = await this.documentation.file(req.user.userId, id);
    return new StreamableFile(createReadStream(file.filePath), { type: 'application/pdf', length: file.size, disposition: `${download === '1' ? 'attachment' : 'inline'}; filename="${file.fileName}"` });
  }
}
