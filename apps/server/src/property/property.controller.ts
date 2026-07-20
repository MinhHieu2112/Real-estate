import {
  Body,
  Controller,
  Get,
  Param,
  ParseArrayPipe,
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

@Controller('property')
export class PropertyController {
  constructor(private readonly propertyService: PropertyService) {}

  @Get('favoritesIds')
  @ApiOperation({
    summary: 'Get favorite properties ids',
  })
  @ApiResponse({
    status: 200,
    description: 'Get favorite properties ids successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request',
  })
  async getProperties(
    @Query('favoriteIds', ParseArrayPipe) favoritesIds: number[],
    @Query() getPropertyDto: GetPropertyDto,
  ) {
    return await this.propertyService.getProperties(
      favoritesIds,
      getPropertyDto,
    );
  }

  @Get('id')
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
  async getPropertyById(@Param('id') id: number) {
    return await this.propertyService.getPropertyById(id);
  }

  @Post()
  @UseInterceptors(FilesInterceptor('files'))
  @ApiOperation({
    summary: 'Create property',
  })
  @ApiResponse({
    status: 200,
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
}
