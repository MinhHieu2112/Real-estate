import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ManagerService } from './manager.service';
import { CreateManagerDto } from './dto/create-manager.dto';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ManagerResponseDto } from './dto/manager-response.dto';
import { UpdateManagerDto } from './dto/update-manager.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Public } from '../auth/public.decorator';

@Controller('managers')
@UseGuards(JwtAuthGuard)
export class ManagerController {
  constructor(private readonly managerService: ManagerService) {}

  @Public()
  @Post()
  @ApiOperation({
    summary: 'Create a new manager',
  })
  @ApiResponse({
    status: 201,
    description: 'Manager created successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Manager not found',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async createManager(
    @Body() createManagerDto: CreateManagerDto,
  ): Promise<ManagerResponseDto> {
    return await this.managerService.createManager(createManagerDto);
  }

  @Get(':cognitoId')
  @ApiOperation({
    summary: 'Get manager',
  })
  @ApiResponse({
    status: 200,
    description: 'Managers found successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Managers not found',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async getManagers(
    @Param('cognitoId') cognitoId: string,
  ): Promise<ManagerResponseDto> {
    return await this.managerService.getManager(cognitoId);
  }

  @Patch(':cognitoId')
  @ApiOperation({
    summary: 'Update manager',
  })
  @ApiResponse({
    status: 200,
    description: 'Manager updated successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Manager not found',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async updateManager(
    @Param('cognitoId') cognitoId: string,
    @Body() updateManagerDto: UpdateManagerDto,
  ) {
    return await this.managerService.updateManager(cognitoId, updateManagerDto);
  }

  @Get(':cognitoId/properties')
  @ApiOperation({
    summary: 'Get manager properties',
  })
  @ApiResponse({
    status: 200,
    description: 'Properties found successfully',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async getManagerProperties(@Param('cognitoId') cognitoId: string) {
    return await this.managerService.getManagerProperties(cognitoId);
  }
}
