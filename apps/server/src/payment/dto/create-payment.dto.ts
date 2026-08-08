import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  Min,
} from 'class-validator';
import { PaymentStatus } from '../../generated/prisma/enums';

export class CreatePaymentDto {
  @IsNumber()
  @Min(0)
  amountDue: number;

  @IsNumber()
  @Min(0)
  amountPaid: number;

  @IsDateString()
  dueDate: string;

  @IsOptional()
  @IsDateString()
  paymentDate?: string;

  @IsEnum(PaymentStatus)
  paymentStatus: PaymentStatus;
}
