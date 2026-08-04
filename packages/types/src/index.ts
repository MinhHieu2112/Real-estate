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

export enum PropertyTypeEnum {
  Rooms = "Phòng trọ",
  Minihouse = "Nhà mini",
  Apartment = "Căn hộ chung cư",
  Villa = "Biệt thự",
  Townhouse = "Nhà phố",
  Cottage = "Nhà vườn",
}

export enum AmenityEnum {
  AirConditioning = "Điều hòa",
  Washer = "Máy giặt",
  Dryer = "Máy sấy",
  Refrigerator = "Tủ lạnh",
  Microwave = "Lò vi sóng",
  Dishwasher = "Máy rửa bát",
  Oven = "Lò nướng",
  Kitchen = "Nhà bếp đầy đủ",
  WiFi = "Wi-Fi",
  Television = "TV",
  Parking = "Chỗ đậu xe",
  Elevator = "Thang máy",
  SwimmingPool = "Hồ bơi",
  Gym = "Phòng gym",
  Balcony = "Ban công",
  Garden = "Sân vườn",
  CCTV = "Camera an ninh",
  Furnished = "Đầy đủ nội thất",
}

export enum HighlightEnum {
    NewlyRenovated = "Mới được cải tạo",
    NewlyBuilt = "Mới xây dựng",
    PrimeLocation = "Vị trí đắc địa",
    CityView = "View thành phố",
    SeaView = "View biển",
    MountainView = "View núi",
    RiverView = "View sông",
    QuietNeighborhood = "Khu dân cư yên tĩnh",
    NearSchool = "Gần trường học",
    NearHospital = "Gần bệnh viện",
    NearSupermarket = "Gần siêu thị",
    NearPublicTransport = "Gần phương tiện công cộng",
    HighSecurityArea = "Khu vực an ninh cao",
    SpaciousLayout = "Thiết kế rộng rãi",
    NaturalLight = "Ánh sáng tự nhiên",
    PetFriendlyCommunity = "Cộng đồng thân thiện với thú cưng",
}