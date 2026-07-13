export class LeaseDto {
  id!: number;
  startDate!: Date;
  endDate!: Date;
  nextPaymentDate!: Date;
  rent!: number;
  deposit!: number;
  propertyId!: number;
  tenantCognitoId!: string;
}

export class ApplicationResponseDto {
  leases: LeaseDto[] = [];
}
