import { Controller, Get, Param } from '@nestjs/common';
import { LeaseService } from './lease.service';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';

@Controller('lease')
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

  @Get()
  @ApiOperation({
    summary: 'Get payment by id',
  })
  @ApiResponse({
    status: 200,
    description: 'Get payment successfully',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async getLeasePayment(@Param() leaseId: number) {
    return await this.leaseService.getLeasePayment(leaseId);
  }
}
