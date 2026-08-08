import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PaymentService } from './payment.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { ConfirmPaymentDto } from './dto/confirm-payment.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@ApiTags('payments')
@Controller('payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Get('manager')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('manager')
  @ApiOperation({ summary: 'Lấy danh sách thanh toán dành cho Manager' })
  async getManagerPayments(@Req() req: any) {
    const managerCognitoId = req.user?.sub || req.user?.userId;
    return this.paymentService.getManagerPayments(managerCognitoId);
  }

  @Get('lease/:leaseId')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Lấy danh sách thanh toán theo Hợp đồng' })
  async getPaymentsByLease(@Param('leaseId', ParseIntPipe) leaseId: number) {
    return this.paymentService.getPaymentsByLease(leaseId);
  }

  @Post('lease/:leaseId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('manager')
  @ApiOperation({ summary: 'Tạo đợt thanh toán thủ công cho Hợp đồng' })
  async createPaymentRecord(
    @Param('leaseId', ParseIntPipe) leaseId: number,
    @Body() dto: CreatePaymentDto,
  ) {
    return this.paymentService.createPaymentRecord(leaseId, dto);
  }

  @Post(':paymentId/confirm')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('manager')
  @ApiOperation({ summary: 'Xác nhận thanh toán (Manager)' })
  async confirmPayment(
    @Param('paymentId', ParseIntPipe) paymentId: number,
    @Body() dto: ConfirmPaymentDto,
  ) {
    return this.paymentService.confirmPayment(paymentId, dto);
  }
}
