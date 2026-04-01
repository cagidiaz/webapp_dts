import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.product_categories.findMany({
      orderBy: [
        { family_name: 'asc' },
        { subfamily_name: 'asc' }
      ]
    });
  }

  async getFamilies() {
    const result = await this.prisma.product_categories.findMany({
      select: { family_code: true, family_name: true },
      distinct: ['family_code'],
      orderBy: { family_name: 'asc' }
    });
    return result;
  }

  async getSubfamiliesByFamily(familyCode: string) {
    return this.prisma.product_categories.findMany({
      where: { family_code: familyCode },
      orderBy: { subfamily_name: 'asc' }
    });
  }
}
