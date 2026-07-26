import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { TenantService } from './tenant.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { TenantResponseDto } from './dto/tenant-response.dto';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PropertyResponseDto } from './dto/property-response.dto';

@Controller('tenants')
export class TenantController {
  constructor(private readonly tenantService: TenantService) {}

  // Get tenant by cognitoId
  @Get(':cognitoId')
  @ApiOperation({ summary: 'Get tenant' })
  @ApiResponse({
    status: 200,
    description: 'Tenant retrieved successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 404,
    description: 'Tenant not found',
  })
  async findOne(
    @Param('cognitoId') cognitoId: string,
  ): Promise<TenantResponseDto> {
    return await this.tenantService.findByCognitoId(cognitoId);
  }

  // Create tenant
  @Post()
  @ApiOperation({ summary: 'Create tenant' })
  @ApiResponse({
    status: 201,
    description: 'Tenant created successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request',
  })
  async create(
    @Body() createTenantDto: CreateTenantDto,
  ): Promise<TenantResponseDto> {
    return await this.tenantService.createTenant(createTenantDto);
  }

  // Update tenant
  @Patch(':cognitoId')
  async update(
    @Param('cognitoId') cognitoId: string,
    @Body() updateTenantDto: UpdateTenantDto,
  ): Promise<TenantResponseDto> {
    return await this.tenantService.updateTenant(cognitoId, updateTenantDto);
  }

  // Get current residences
  @Get(':cognitoId/current-residences')
  @ApiOperation({ summary: 'Get current residences' })
  @ApiResponse({
    status: 200,
    description: 'Current residences retrieved successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  async getCurrentResidences(
    @Param('cognitoId') cognitoId: string,
  ): Promise<PropertyResponseDto> {
    return await this.tenantService.getResidences(cognitoId);
  }

  // Add favorite property
  @Post(':cognitoId/favorites/:propertyId')
  @ApiOperation({ summary: 'Add favorite property' })
  @ApiResponse({
    status: 200,
    description: 'Favorite property added successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  async addFavoriteProperty(
    @Param('cognitoId') cognitoId: string,
    @Param('propertyId', ParseIntPipe) propertyId: number,
  ) {
    return await this.tenantService.addFavorite(cognitoId, propertyId);
  }

  // Remove favorite property
  @Delete(':cognitoId/favorites/:propertyId')
  @ApiOperation({ summary: 'Remove favorite property' })
  @ApiResponse({
    status: 200,
    description: 'Favorite property removed successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  async removeFavoriteProperty(
    @Param('cognitoId') cognitoId: string,
    @Param('propertyId', ParseIntPipe) propertyId: number,
  ) {
    return await this.tenantService.removeFavorite(cognitoId, propertyId);
  }
}
