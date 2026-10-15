import { Controller, Post, Get, Body, Query, BadRequestException, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { OutlookAddinService, EmailLookupDto, LogEmailDto } from './outlook-addin.service';

import { JwtAuthGuard } from '../../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@ApiTags('outlook-addin')
@Controller('outlook-addin')
export class OutlookAddinController {
  constructor(private readonly addinService: OutlookAddinService) {}

  @Post('lookup')
  @ApiOperation({ summary: 'Busca el contacto, cliente, ofertas abiertas y estado previo para el Add-in de Outlook' })
  async lookup(@Req() req: any, @Body() body: EmailLookupDto) {
    if (!body.userEmail) {
      throw new BadRequestException('El campo userEmail es requerido.');
    }
    return await this.addinService.lookup(body, req.user.userId);
  }

  @Post('log-email')
  @ApiOperation({ summary: 'Registra el correo en el CRM vinculado al contacto y/u oferta' })
  async logEmail(@Req() req: any, @Body() body: LogEmailDto) {
    if (!body.userEmail) {
      throw new BadRequestException('El campo userEmail es obligatorio.');
    }
    if (!body.subject && !body.body) {
      throw new BadRequestException('El correo debe contener al menos un asunto o cuerpo.');
    }
    return await this.addinService.logEmail(body, req.user.userId);
  }

  @Get('search-companies')
  @ApiOperation({ summary: 'Busca empresas por nombre o código para el Add-in de Outlook' })
  async searchCompanies(@Req() req: any, @Query('q') query: string) {
    return await this.addinService.searchCompanies(query || '', req.user.userId);
  }

  @Get('company-contacts')
  @ApiOperation({ summary: 'Obtiene los contactos registrados de una empresa cliente' })
  async getCompanyContacts(@Req() req: any, @Query('clientId') clientId: string) {
    if (!clientId) {
      throw new BadRequestException('El parámetro clientId es obligatorio.');
    }
    return await this.addinService.getCompanyContacts(clientId, req.user.userId);
  }

  @Get('company-quotes')
  @ApiOperation({ summary: 'Obtiene las ofertas abiertas de una empresa cliente' })
  async getCompanyQuotes(@Req() req: any, @Query('clientId') clientId: string) {
    if (!clientId) {
      throw new BadRequestException('El parámetro clientId es obligatorio.');
    }
    return await this.addinService.getCompanyQuotes(clientId, req.user.userId);
  }
}
