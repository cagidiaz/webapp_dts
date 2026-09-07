import { Controller, Post, Get, Body, Query, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { OutlookAddinService, EmailLookupDto, LogEmailDto } from './outlook-addin.service';

@ApiTags('outlook-addin')
@Controller('outlook-addin')
export class OutlookAddinController {
  constructor(private readonly addinService: OutlookAddinService) {}

  @Post('lookup')
  @ApiOperation({ summary: 'Busca el contacto, cliente, ofertas abiertas y estado previo para el Add-in de Outlook' })
  async lookup(@Body() body: EmailLookupDto) {
    if (!body.userEmail) {
      throw new BadRequestException('El campo userEmail es requerido.');
    }
    return await this.addinService.lookup(body);
  }

  @Post('log-email')
  @ApiOperation({ summary: 'Registra el correo en el CRM vinculado al contacto y/u oferta' })
  async logEmail(@Body() body: LogEmailDto) {
    if (!body.userEmail) {
      throw new BadRequestException('El campo userEmail es obligatorio.');
    }
    if (!body.subject && !body.body) {
      throw new BadRequestException('El correo debe contener al menos un asunto o cuerpo.');
    }
    return await this.addinService.logEmail(body);
  }

  @Get('search-companies')
  @ApiOperation({ summary: 'Busca empresas por nombre o código para el Add-in de Outlook' })
  async searchCompanies(@Query('q') query: string) {
    return await this.addinService.searchCompanies(query || '');
  }
}
