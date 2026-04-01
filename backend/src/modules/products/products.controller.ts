import { Controller, Get, Param, UseGuards, Post, Body, Put, Delete, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';

@ApiTags('products')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @ApiOperation({ summary: 'Obtener todos los productos (admite búsqueda, filtros avanzados, ordenación y paginación)' })
  @ApiQuery({ name: 'take', required: false, type: Number })
  @ApiQuery({ name: 'skip', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'family', required: false, type: String })
  @ApiQuery({ name: 'vendor', required: false, type: String })
  @ApiQuery({ name: 'withStock', required: false, type: Boolean })
  @ApiQuery({ name: 'isBlocked', required: false, type: Boolean })
  @ApiQuery({ name: 'sortBy', required: false, type: String })
  @ApiQuery({ name: 'sortDir', required: false, enum: ['asc', 'desc'] })
  async getAll(
    @Query('take') take?: number,
    @Query('skip') skip?: number,
    @Query('search') search?: string,
    @Query('family') family?: string,
    @Query('vendor') vendor?: string,
    @Query('withStock') withStock?: string,
    @Query('isBlocked') isBlocked?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortDir') sortDir?: 'asc' | 'desc',
  ) {
    return this.productsService.getAll({ 
      take, 
      skip, 
      search, 
      family, 
      vendor, 
      withStock: withStock === 'true',
      isBlocked: isBlocked === 'true' ? true : isBlocked === 'false' ? false : undefined,
      sortBy,
      sortDir
    });
  }

  @Get('families')
  @ApiOperation({ summary: 'Obtener lista de familias únicas' })
  async getFamilies() {
    return this.productsService.getFamilies();
  }

  @Get('vendors')
  @ApiOperation({ summary: 'Obtener lista de proveedores únicos' })
  async getVendors() {
    return this.productsService.getVendors();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un producto por ID (UUID)' })
  async getById(@Param('id') id: string) {
    return this.productsService.getById(id);
  }

  @Get('code/:itemNo')
  @ApiOperation({ summary: 'Obtener un producto por su código (Item No)' })
  async getByItemNo(@Param('itemNo') itemNo: string) {
    return this.productsService.getByItemNo(itemNo);
  }

  @Post()
  @ApiOperation({ summary: 'Crear un nuevo producto' })
  async create(@Body() data: any) {
    return this.productsService.create(data);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar un producto existente' })
  async update(@Param('id') id: string, @Body() data: any) {
    return this.productsService.update(id, data);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar un producto' })
  async remove(@Param('id') id: string) {
    return this.productsService.remove(id);
  }
}
