export * from "./enums/amenity.enum";
export * from "./enums/highlight.enum";
export * from "./enums/property-type.enum";
export * from "./enums/property-status.enum";

export * from "./constants/amenity-label";
export * from "./constants/highlight-label";
export * from "./constants/property-type-label";
export * from "./constants/property-status-label";

import { AmenityEnum } from "./enums/amenity.enum";
import { HighlightEnum } from "./enums/highlight.enum";
import { PropertyTypeEnum } from "./enums/property-type.enum";

export interface Tenant {
  id: number;
  cognitoId: string;
  name: string;
  email: string;
  phoneNumber: string;
  image?: string;
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
  image?: string;
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
  status: PropertyStatus;
  pricePerMonth: number;
  securityDeposit: number;
  applicationFee: number;
  photoUrls: string[];
  amenities: AmenityEnum[];
  highlights: HighlightEnum[];
  isPetsAllowed: boolean;
  isParkingIncluded: boolean;
  beds: number;
  baths: number;
  squareFeet: number;
  propertyType: PropertyTypeEnum;
  availableFrom: string | Date;
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
  startDate: string | Date;
  endDate?: string | Date | null;
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
  manager?: Manager;
  lease?: Lease | null;
}

export interface Lease {
  id: number;
  startDate: string | Date;
  endDate: string | Date;
  nextPaymentDate?: string | Date;
  rent: number;
  deposit: number;
  propertyId: number;
  status: LeaseStatus;
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
  userRole: "manager" | "tenant";
}

export interface Notification {
  id: number;
  receiverCognitoId: string;
  senderCognitoId?: string | null;
  type: "New_application" | "Application_approved" | "Application_denied" | "New_message";
  title: string;
  content: string;
  isRead: boolean;
  applicationId?: number | null;
  conversationId?: number | null;
  messageId?: number | null;
  createdAt: string | Date;
}

export interface Message {
  id: number;
  conversationId: number;
  senderCognitoId: string;
  content: string;
  isRead: boolean;
  createdAt: string | Date;
}

export interface PeerInfo {
  cognitoId: string;
  name: string;
  email: string;
}

export interface ChatConversation {
  id: number;
  tenantCognitoId: string;
  managerCognitoId: string;
  lastMessage: string | null;
  lastMessageAt: string | Date | null;
  unreadCount: number;
  peer: PeerInfo | null;
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

export enum LeaseStatus {
  Draft = "Draft",
  Active = "Active",
  Terminated = "Terminated",
  Expired = "Expired",
}

export enum NotificationType {
  New_application = "New_application",
  Application_approved = "Application_approved",
  Application_denied = "Application_denied",
  New_message = "New_message"
}

export enum PropertyStatus {
  Available = "Available",
  Rented = "Rented",
  Maintenance = "Maintenance"
}