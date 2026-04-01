import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';

@ApiTags('Categories')
@UseGuards(JwtAuthGuard)
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @ApiOperation({ summary: 'Obtener todas las categorías y subfamilias' })
  findAll() {
    return this.categoriesService.findAll();
  }

  @Get('families')
  @ApiOperation({ summary: 'Obtener lista única de familias' })
  getFamilies() {
    return this.categoriesService.getFamilies();
  }

  @Get('subfammilies/:familyCode')
  @ApiOperation({ summary: 'Obtener subfamilias de una familia específica' })
  getSubfamilies(@Param('familyCode') familyCode: string) {
    return this.categoriesService.getSubfamiliesByFamily(familyCode);
  }
}
