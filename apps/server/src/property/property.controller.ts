import {
  Body,
  Controller,
  Get,
  Patch,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { PropertyService } from './property.service';
import { GetPropertyDto } from './dto/get-property.dto';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { FilesInterceptor } from '@nestjs/platform-express';
import { CreatePropertyDto } from './dto/create-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Public } from '../auth/public.decorator';
import { CurrentUser } from '../auth/get-user.decorator';
import { CognitoUser } from '../auth/jwt-auth.guard';

@Controller('properties')
export class PropertyController {
  constructor(private readonly propertyService: PropertyService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get properties' })
  @ApiResponse({ status: 200, description: 'Get properties successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async getProperties(@Query() getPropertyDto: GetPropertyDto) {
    return await this.propertyService.getProperties(
      getPropertyDto.favoriteIds || [],
      getPropertyDto,
    );
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get property by id' })
  @ApiResponse({ status: 200, description: 'Get property by id successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async getPropertyById(@Param('id', ParseIntPipe) id: number) {
    return await this.propertyService.getPropertyById(id);
  }

  @Public()
  @Get(':id/leases')
  @ApiOperation({ summary: 'Get property leases' })
  @ApiResponse({ status: 200, description: 'Get property leases successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async getPropertyLeases(@Param('id', ParseIntPipe) id: number) {
    return await this.propertyService.getPropertyLeases(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('manager')
  @UseInterceptors(FilesInterceptor('files'))
  @ApiOperation({ summary: 'Create property' })
  @ApiResponse({ status: 201, description: 'Upload property successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async createProperties(
    @Body() createPropertyDto: CreatePropertyDto,
    @CurrentUser() user: CognitoUser,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    // Always use managerCognitoId from verified JWT, never from request body
    return await this.propertyService.createProperty(
      { ...createPropertyDto, managerCognitoId: user.sub },
      files,
    );
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('manager')
  @UseInterceptors(FilesInterceptor('files'))
  @ApiOperation({ summary: 'Update property' })
  @ApiResponse({ status: 200, description: 'Update property successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async updateProperty(
    @Param('id', ParseIntPipe) id: number,
    @Body() updatePropertyDto: UpdatePropertyDto,
    @CurrentUser() user: CognitoUser,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    return await this.propertyService.updateProperty(
      id,
      { ...updatePropertyDto, managerCognitoId: user.sub },
      files,
    );
  }
}
