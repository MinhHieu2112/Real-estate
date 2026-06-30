export interface Tenant {
  id: number;
  cognitoId: string;
  name: string;
  email: string;
  phoneNumber: string;
  properties?: Property[];
  favorites?: Property[];
  applications?: Application[];
  leases?: Lease[];
}

export interface Manager {
  id: number;
  cognitoId: string;
  name: string;
  email: string;
  phoneNumber: string;
  managedProperties?: Property[];
}

export interface Location {
  id: number;
  address: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  coordinates: any;
}

export interface Property {
  id: number;
  name: string;
  description: string;
  pricePerMonth: number;
  securityDeposit: number;
  applicationFee: number;
  photoUrls: string[];
  amenities: Amenity[];
  highlights: Highlight[];
  isPetsAllowed: boolean;
  isParkingIncluded: boolean;
  beds: number;
  baths: number;
  squareFeet: number;
  propertyType: PropertyType;
  postedDate: string | Date;
  averageRating?: number | null;
  numberOfReviews?: number | null;
  locationId: number;
  managerCognitoId: string;
  location?: Location;
  manager?: Manager;
}

export interface Application {
  id: number;
  applicationDate: string | Date;
  status: ApplicationStatus;
  propertyId: number;
  tenantCognitoId: string;
  name: string;
  email: string;
  phoneNumber: string;
  message?: string | null;
  leaseId?: number | null;
  property?: Property;
  tenant?: Tenant;
  lease?: Lease | null;
}

export interface Lease {
  id: number;
  startDate: string | Date;
  endDate: string | Date;
  rent: number;
  deposit: number;
  propertyId: number;
  tenantCognitoId: string;
  property?: Property;
  tenant?: Tenant;
  payments?: Payment[];
}

export interface Payment {
  id: number;
  amountDue: number;
  amountPaid: number;
  dueDate: string | Date;
  paymentDate: string | Date;
  paymentStatus: PaymentStatus;
  leaseId: number;
  lease?: Lease;
}

export interface User {
  cognitoInfo: {
    userId: string;
    username: string;
    signInDetails?: {
      loginId?: string;
      authFlowType?: string;
    };
  };
  userInfo: Tenant | Manager;
  userRole: string;
}

// Enums matching Prisma schema
export enum Highlight {
  HighSpeedInternetAccess = "HighSpeedInternetAccess",
  WasherDryer = "WasherDryer",
  AirConditioning = "AirConditioning",
  Heating = "Heating",
  SmokeFree = "SmokeFree",
  CableReady = "CableReady",
  SatelliteTV = "SatelliteTV",
  DoubleVanities = "DoubleVanities",
  TubShower = "TubShower",
  Intercom = "Intercom",
  SprinklerSystem = "SprinklerSystem",
  RecentlyRenovated = "RecentlyRenovated",
  CloseToTransit = "CloseToTransit",
  GreatView = "GreatView",
  QuietNeighborhood = "QuietNeighborhood",
}

export enum Amenity {
  WasherDryer = "WasherDryer",
  AirConditioning = "AirConditioning",
  Dishwasher = "Dishwasher",
  HighSpeedInternet = "HighSpeedInternet",
  HardwoodFloors = "HardwoodFloors",
  WalkInClosets = "WalkInClosets",
  Microwave = "Microwave",
  Refrigerator = "Refrigerator",
  Pool = "Pool",
  Gym = "Gym",
  Parking = "Parking",
  PetsAllowed = "PetsAllowed",
  WiFi = "WiFi",
}

export enum PropertyType {
  Rooms = "Rooms",
  Tinyhouse = "Tinyhouse",
  Apartment = "Apartment",
  Villa = "Villa",
  Townhouse = "Townhouse",
  Cottage = "Cottage",
}

export enum ApplicationStatus {
  Pending = "Pending",
  Denied = "Denied",
  Approved = "Approved",
}

export enum PaymentStatus {
  Pending = "Pending",
  Paid = "Paid",
  PartiallyPaid = "PartiallyPaid",
  Overdue = "Overdue",
}
