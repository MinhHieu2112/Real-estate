import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
  Req,
} from '@nestjs/common';
import { LeaseService } from './lease.service';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Public } from '../auth/public.decorator';
import { UpdateLeaseContentDto } from './dto/update-lease-content.dto';

@ApiTags('leases')
@Controller('leases')
@UseGuards(JwtAuthGuard)
export class LeaseController {
  constructor(private readonly leaseService: LeaseService) {}

  @Get()
  @ApiOperation({ summary: 'Get all leases' })
  async findAll() {
    return await this.leaseService.findAll();
  }

  @Get('manager')
  @UseGuards(RolesGuard)
  @Roles('manager')
  @ApiOperation({ summary: 'Get manager leases' })
  async findManagerLeases(@Req() req: any) {
    return await this.leaseService.findManagerLeases(req.user.sub);
  }

  @Public()
  @Get('sign/:token')
  @ApiOperation({ summary: 'Get contract details for public signing page' })
  async getSigningPage(@Param('token') token: string) {
    return await this.leaseService.getSigningPage(token);
  }

  @Public()
  @Post('sign')
  @ApiOperation({ summary: 'Tenant signs contract with token' })
  async signContract(@Body('token') token: string, @Req() req: any) {
    const ipAddress =
      req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
    return await this.leaseService.signContract(token, String(ipAddress));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get lease detail by ID' })
  async getLeaseDetail(@Param('id', ParseIntPipe) id: number) {
    return await this.leaseService.getLeaseDetail(id);
  }

  @Put(':id/content')
  @UseGuards(RolesGuard)
  @Roles('manager')
  @ApiOperation({ summary: 'Update lease content before sending' })
  async updateLeaseContent(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any,
    @Body() dto: UpdateLeaseContentDto,
  ) {
    return await this.leaseService.updateLeaseContent(id, req.user.sub, dto);
  }

  @Post(':id/send')
  @UseGuards(RolesGuard)
  @Roles('manager')
  @ApiOperation({ summary: 'Send contract to tenant with PDF & sign URL' })
  async sendContractToTenant(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any,
  ) {
    return await this.leaseService.sendContractToTenant(id, req.user.sub);
  }
}
