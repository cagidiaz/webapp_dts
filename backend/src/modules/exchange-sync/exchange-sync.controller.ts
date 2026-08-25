import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
  Headers,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { ExchangeSyncService } from './exchange-sync.service';
import { MicrosoftGraphService } from './microsoft-graph.service';

@Controller('exchange-sync')
export class ExchangeSyncController {
  constructor(
    private readonly exchangeSyncService: ExchangeSyncService,
    private readonly graphService: MicrosoftGraphService,
  ) {}

  /**
   * Obtiene la URL de autorización para conectar la cuenta de Microsoft 365 / Exchange.
   */
  @Get('connect-url')
  @UseGuards(JwtAuthGuard)
  getConnectUrl(@Req() req: any, @Query('redirectUri') redirectUri?: string) {
    const userId = req.user?.userId || req.user?.id;
    const authUrl = this.graphService.getAuthorizationUrl(userId, redirectUri);
    return { authUrl };
  }

  /**
   * Procesa el código de autorización devuelto por Microsoft para completar la vinculación.
   */
  @Post('callback')
  @UseGuards(JwtAuthGuard)
  async handleCallback(
    @Req() req: any,
    @Body() body: { code: string; redirectUri?: string },
  ) {
    const userId = req.user?.userId || req.user?.id;
    return await this.exchangeSyncService.connectAccount(userId, body.code, body.redirectUri);
  }

  /**
   * Obtiene el estado de conexión de Exchange del usuario actual.
   */
  @Get('status')
  @UseGuards(JwtAuthGuard)
  async getStatus(@Req() req: any) {
    const userId = req.user?.userId || req.user?.id;
    return await this.exchangeSyncService.getStatus(userId);
  }

  /**
   * Desconecta la cuenta de Exchange del usuario actual.
   */
  @Post('disconnect')
  @UseGuards(JwtAuthGuard)
  async disconnect(@Req() req: any) {
    const userId = req.user?.userId || req.user?.id;
    return await this.exchangeSyncService.disconnectAccount(userId);
  }

  /**
   * Fuerza una sincronización manual inmediata entre Outlook y el CRM.
   */
  @Post('sync-now')
  @UseGuards(JwtAuthGuard)
  async syncNow(@Req() req: any) {
    const userId = req.user?.userId || req.user?.id;
    return await this.exchangeSyncService.syncOutlookToCrm(userId);
  }

  /**
   * Envía un correo electrónico a través de la cuenta de Exchange del usuario y lo guarda en el CRM.
   */
  @Post('send-email')
  @UseGuards(JwtAuthGuard)
  async sendEmail(
    @Req() req: any,
    @Body()
    payload: {
      contactId?: string;
      clientId?: string;
      to: string[];
      cc?: string[];
      bcc?: string[];
      subject: string;
      body: string;
      isHtml?: boolean;
    },
  ) {
    const userId = req.user?.userId || req.user?.id;
    return await this.exchangeSyncService.sendEmailFromCrm(userId, payload);
  }

  /**
   * Receptor de Webhook para notificaciones en tiempo real de Microsoft Graph.
   * Valida tokens y procesa cambios de calendario y buzón.
   */
  @Get('webhook')
  handleWebhookValidation(@Query('validationToken') validationToken: string) {
    // Microsoft Graph envía una petición GET con validationToken al crear una suscripción
    if (validationToken) {
      return validationToken;
    }
    return 'OK';
  }

  @Post('webhook')
  @HttpCode(HttpStatus.ACCEPTED)
  async handleWebhookNotification(
    @Query('validationToken') validationToken: string,
    @Body() body: any,
  ) {
    if (validationToken) {
      return validationToken;
    }
    // Procesa las notificaciones push en segundo plano
    return { status: 'accepted' };
  }
}
