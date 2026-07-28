import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { LeaseService } from './lease.service';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';

@Controller('leases')
export class LeaseController {
  constructor(private readonly leaseService: LeaseService) {}

  @Get()
  @ApiOperation({
    summary: 'Get all leases',
  })
  @ApiResponse({
    status: 200,
    description: 'Get all leases',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async findAll() {
    return await this.leaseService.findAll();
  }

  @Get(':id/payments')
  @ApiOperation({
    summary: 'Get lease payments',
  })
  @ApiResponse({
    status: 200,
    description: 'Get payment successfully',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async getLeasePayments(@Param('id', ParseIntPipe) leaseId: number) {
    return await this.leaseService.getLeasePayments(leaseId);
  }
}
