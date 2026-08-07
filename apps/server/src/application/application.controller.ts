import {
  Controller,
  Get,
  Query,
  Body,
  Param,
  Patch,
  Put,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ApplicationService } from './application.service';
import { CreateApplicationDto } from './dto/create-application.dto';
import { UpdateApplicationDto } from './dto/update-application.dto';
import { ListApplicationDto } from './dto/list-application.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/get-user.decorator';
import { CognitoUser } from '../auth/jwt-auth.guard';

@Controller('applications')
@UseGuards(JwtAuthGuard)
export class ApplicationController {
  constructor(private readonly applicationService: ApplicationService) {}

  @Get()
  @ApiOperation({ summary: 'Get all applications' })
  @ApiResponse({
    status: 200,
    description: 'Get all applications successfully',
  })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async listApplication(@Query() listApplicationDto: ListApplicationDto) {
    return await this.applicationService.listApplication(listApplicationDto);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('tenant')
  @ApiOperation({ summary: 'Create application' })
  @ApiResponse({ status: 201, description: 'Create application successfully' })
  @ApiResponse({ status: 404, description: 'Property not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async createApplication(
    @Body() createApplication: CreateApplicationDto,
    @CurrentUser() user: CognitoUser,
  ) {
    // Always use tenantCognitoId from verified JWT
    return await this.applicationService.createApplication({
      ...createApplication,
      tenantCognitoId: user.sub,
    });
  }

  @Put(':applicationId/status')
  @Patch(':applicationId')
  @UseGuards(RolesGuard)
  @Roles('manager')
  @ApiOperation({ summary: 'Update application status' })
  @ApiResponse({
    status: 200,
    description: 'Update application status successfully',
  })
  @ApiResponse({ status: 404, description: 'Application not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async updateApplication(
    @Param('applicationId', ParseIntPipe) applicationId: number,
    @Body() updateApplication: UpdateApplicationDto,
  ) {
    return await this.applicationService.updateApplicationStatus(
      applicationId,
      updateApplication,
    );
  }
}
