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
  UseInterceptors,
} from '@nestjs/common';
import { PropertyService } from './property.service';
import { GetPropertyDto } from './dto/get-property.dto';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { FilesInterceptor } from '@nestjs/platform-express';
import { CreatePropertyDto } from './dto/create-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';

@Controller('properties')
export class PropertyController {
  constructor(private readonly propertyService: PropertyService) {}

  @Get()
  @ApiOperation({
    summary: 'Get properties',
  })
  @ApiResponse({
    status: 200,
    description: 'Get properties successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request',
  })
  async getProperties(@Query() getPropertyDto: GetPropertyDto) {
    return await this.propertyService.getProperties(
      getPropertyDto.favoriteIds || [],
      getPropertyDto,
    );
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get property by id',
  })
  @ApiResponse({
    status: 200,
    description: 'Get property by id successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request',
  })
  async getPropertyById(@Param('id', ParseIntPipe) id: number) {
    return await this.propertyService.getPropertyById(id);
  }

  @Get(':id/leases')
  @ApiOperation({
    summary: 'Get property leases',
  })
  @ApiResponse({
    status: 200,
    description: 'Get property leases successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request',
  })
  async getPropertyLeases(@Param('id', ParseIntPipe) id: number) {
    return await this.propertyService.getPropertyLeases(id);
  }

  @Post()
  @UseInterceptors(FilesInterceptor('files'))
  @ApiOperation({
    summary: 'Create property',
  })
  @ApiResponse({
    status: 201,
    description: 'Upload property successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request',
  })
  async createProperties(
    @Body() createPropertyDto: CreatePropertyDto,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    return await this.propertyService.createProperty(createPropertyDto, files);
  }

  @Patch(':id')
  @UseInterceptors(FilesInterceptor('files'))
  @ApiOperation({
    summary: 'Update property',
  })
  @ApiResponse({
    status: 200,
    description: 'Update property successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request',
  })
  async updateProperty(
    @Param('id', ParseIntPipe) id: number,
    @Body() updatePropertyDto: UpdatePropertyDto,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    return await this.propertyService.updateProperty(
      id,
      updatePropertyDto,
      files,
    );
  }
}
