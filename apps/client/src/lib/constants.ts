import {
  Wifi,
  Waves,
  Dumbbell,
  Car,
  PawPrint,
  Tv,
  Thermometer,
  Cigarette,
  Cable,
  Maximize,
  Bath,
  Phone,
  Sprout,
  Hammer,
  Bus,
  Mountain,
  VolumeX,
  Home,
  Warehouse,
  Building,
  Castle,
  Trees,
  LucideIcon,
} from "lucide-react";

export enum AmenityEnum {
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

export const AmenityIcons: Record<AmenityEnum, LucideIcon> = {
  WasherDryer: Waves,
  AirConditioning: Thermometer,
  Dishwasher: Waves,
  HighSpeedInternet: Wifi,
  HardwoodFloors: Home,
  WalkInClosets: Maximize,
  Microwave: Tv,
  Refrigerator: Thermometer,
  Pool: Waves,
  Gym: Dumbbell,
  Parking: Car,
  PetsAllowed: PawPrint,
  WiFi: Wifi,
};

export enum HighlightEnum {
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

export const HighlightIcons: Record<HighlightEnum, LucideIcon> = {
  HighSpeedInternetAccess: Wifi,
  WasherDryer: Waves,
  AirConditioning: Thermometer,
  Heating: Thermometer,
  SmokeFree: Cigarette,
  CableReady: Cable,
  SatelliteTV: Tv,
  DoubleVanities: Maximize,
  TubShower: Bath,
  Intercom: Phone,
  SprinklerSystem: Sprout,
  RecentlyRenovated: Hammer,
  CloseToTransit: Bus,
  GreatView: Mountain,
  QuietNeighborhood: VolumeX,
};

// Tên tiếng Việt cho các tiện ích
export const AmenityViNames: Record<AmenityEnum, string> = {
  WasherDryer: "Máy giặt sấy",
  AirConditioning: "Điều hòa",
  Dishwasher: "Máy rửa bát",
  HighSpeedInternet: "Internet tốc độ cao",
  HardwoodFloors: "Sàn gỗ",
  WalkInClosets: "Tủ quần áo âm tường",
  Microwave: "Lò vi sóng",
  Refrigerator: "Tủ lạnh",
  Pool: "Hồ bơi",
  Gym: "Phòng gym",
  Parking: "Bãi đỗ xe",
  PetsAllowed: "Cho phép thú cưng",
  WiFi: "Wi-Fi",
};

// Tên tiếng Việt cho điểm nổi bật
export const HighlightViNames: Record<HighlightEnum, string> = {
  HighSpeedInternetAccess: "Truy cập Internet tốc độ cao",
  WasherDryer: "Máy giặt sấy",
  AirConditioning: "Điều hòa",
  Heating: "Hệ thống sưởi",
  SmokeFree: "Môi trường không khói thuốc",
  CableReady: "Sẵn sàng truyền hình cáp",
  SatelliteTV: "Truyền hình vệ tinh",
  DoubleVanities: "Bồn rửa đôi",
  TubShower: "Bồn tắm vòi sen",
  Intercom: "Hệ thống đàm thoại nội bộ",
  SprinklerSystem: "Hệ thống chữa cháy tự động",
  RecentlyRenovated: "Mới sửa chữa nâng cấp",
  CloseToTransit: "Gần giao thông công cộng",
  GreatView: "Tầm nhìn đẹp",
  QuietNeighborhood: "Khu vực yên tĩnh",
};

export enum PropertyTypeEnum {
  Rooms = "Rooms",
  Tinyhouse = "Tinyhouse",
  Apartment = "Apartment",
  Villa = "Villa",
  Townhouse = "Townhouse",
  Cottage = "Cottage",
}

export const PropertyTypeIcons: Record<PropertyTypeEnum, LucideIcon> = {
  Rooms: Home,
  Tinyhouse: Warehouse,
  Apartment: Building,
  Villa: Castle,
  Townhouse: Home,
  Cottage: Trees,
};

// Tên tiếng Việt cho từng loại bất động sản
export const PropertyTypeViNames: Record<PropertyTypeEnum, string> = {
  Rooms: "Phòng trọ",
  Tinyhouse: "Nhà mini",
  Apartment: "Căn hộ chung cư",
  Villa: "Biệt thự",
  Townhouse: "Nhà phố",
  Cottage: "Nhà vườn",
};

// Các mức giá thống nhất bằng VNĐ (từ 1 triệu đến 100 triệu)
export const PRICE_RANGES_MIN = [1000000, 2000000, 3000000, 5000000, 10000000, 15000000, 20000000, 30000000, 50000000];
export const PRICE_RANGES_MAX = [2000000, 3000000, 5000000, 10000000, 15000000, 20000000, 30000000, 50000000, 100000000];

// Add this constant at the end of the file
export const NAVBAR_HEIGHT = 52; // in pixels

// Test users for development
export const testUsers = {
  tenant: {
    username: "Carol White",
    userId: "us-east-2:76543210-90ab-cdef-1234-567890abcdef",
    signInDetails: {
      loginId: "carol.white@example.com",
      authFlowType: "USER_SRP_AUTH",
    },
  },
  tenantRole: "tenant",
  manager: {
    username: "John Smith",
    userId: "us-east-2:12345678-90ab-cdef-1234-567890abcdef",
    signInDetails: {
      loginId: "john.smith@example.com",
      authFlowType: "USER_SRP_AUTH",
    },
  },
  managerRole: "manager",
};
