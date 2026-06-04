import { Controller, Post, Body, Get, Patch, Delete, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/roles.decorator';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Create a new user (Admin only)' })
  @ApiResponse({ status: 201, description: 'The user has been successfully created.' })
  async createUser(@Body() createUserDto: CreateUserDto) {
    return this.usersService.createUser(createUserDto);
  }

  @Get('roles')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'List all available roles' })
  async getRoles() {
    return this.usersService.getRoles();
  }

  @Get('status')
  @ApiOperation({ summary: 'Get current user status (Diagnostics)' })
  async getStatus(@Request() req: any) {
    return this.usersService.getUserStatus(req.user.userId);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'List all users' })
  async getUsers() {
    return this.usersService.getUsers();
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Update an existing user (Admin only)' })
  async updateUser(@Param('id') id: string, @Body() updateUserDto: any) {
    return this.usersService.updateUser(id, updateUserDto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Delete a user (Admin only)' })
  async deleteUser(@Param('id') id: string) {
    return this.usersService.deleteUser(id);
  }

  @Get('modules')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Get all modules (Admin only)' })
  async getModules() {
    return this.usersService.getModules();
  }

  @Get('roles/:roleId/modules')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Get modules assigned to a role (Admin only)' })
  async getRolePermissions(@Param('roleId') roleId: string) {
    return this.usersService.getRolePermissions(roleId);
  }

  @Post('roles/:roleId/modules')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Update modules assigned to a role (Admin only)' })
  async updateRolePermissions(
    @Param('roleId') roleId: string,
    @Body('permissions') permissions: { moduleId: string, canView: boolean }[]
  ) {
    return this.usersService.updateRolePermissions(roleId, permissions);
  }

  @Get('permissions/me')
  @ApiOperation({ summary: 'Get modules allowed for the current logged-in user' })
  async getMyPermissions(@Request() req: any) {
    const status = await this.usersService.getUserStatus(req.user.userId);
    if (!status.existsInProfiles || !status.rawProfile.role_id) {
      return [];
    }
    return this.usersService.getRolePermissions(status.rawProfile.role_id);
  }
}
