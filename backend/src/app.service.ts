import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';

@Injectable()
export class AppService {
  constructor(private readonly prisma: PrismaService) {}

  getHello(): string {
    return 'Hello World!';
  }

  async getHealth() {
    try {
      // Intenta una consulta simple para verificar la conexión a la base de datos
      await this.prisma.$queryRaw`SELECT 1`;
      
      return {
        status: 'UP',
        database: 'CONNECTED',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: 'DEGRADED',
        database: 'DISCONNECTED',
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }
}
