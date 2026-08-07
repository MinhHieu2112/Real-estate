import * as Icons from "lucide-react";
import { LucideIcon } from "lucide-react";
import { AmenityEnum, HighlightEnum, PropertyTypeEnum } from "@shared/types";

export const HighlightIcons: Record<HighlightEnum, LucideIcon> = {
  [HighlightEnum.NewlyRenovated]: Icons.Sparkles,
  [HighlightEnum.NewlyBuilt]: Icons.Building2,
  [HighlightEnum.PrimeLocation]: Icons.MapPinned,
  [HighlightEnum.CityView]: Icons.Landmark,
  [HighlightEnum.SeaView]: Icons.Waves,
  [HighlightEnum.MountainView]: Icons.Mountain,
  [HighlightEnum.RiverView]: Icons.Waves,
  [HighlightEnum.QuietNeighborhood]: Icons.Trees,
  [HighlightEnum.NearSchool]: Icons.GraduationCap,
  [HighlightEnum.NearHospital]: Icons.Hospital,
  [HighlightEnum.NearSupermarket]: Icons.Store,
  [HighlightEnum.NearPublicTransport]: Icons.Bus,
  [HighlightEnum.HighSecurityArea]: Icons.ShieldCheck,
  [HighlightEnum.SpaciousLayout]: Icons.Maximize,
  [HighlightEnum.NaturalLight]: Icons.Sun,
  [HighlightEnum.PetFriendlyCommunity]: Icons.PawPrint,
}

export const PropertyTypeIcons: Record<PropertyTypeEnum, LucideIcon> = {
  [PropertyTypeEnum.Rooms]: Icons.Home,
  [PropertyTypeEnum.Tinyhouse]: Icons.Warehouse,
  [PropertyTypeEnum.Apartment]: Icons.Building,
  [PropertyTypeEnum.Villa]: Icons.Castle,
  [PropertyTypeEnum.Townhouse]: Icons.Home,
  [PropertyTypeEnum.Cottage]: Icons.Trees,
};

export const AmenityIcons: Record<AmenityEnum, LucideIcon> = {
  [AmenityEnum.AirConditioning]: Icons.Wind,
  [AmenityEnum.Washer]: Icons.Waves,
  [AmenityEnum.Dryer]: Icons.Waves,
  [AmenityEnum.Refrigerator]: Icons.Refrigerator,
  [AmenityEnum.Microwave]: Icons.Microwave,
  [AmenityEnum.Dishwasher]: Icons.Bath,
  [AmenityEnum.Oven]: Icons.ChefHat,
  [AmenityEnum.Kitchen]: Icons.Home,
  [AmenityEnum.WiFi]: Icons.Wifi,
  [AmenityEnum.Television]: Icons.Tv,
  [AmenityEnum.Parking]: Icons.Car,
  [AmenityEnum.Elevator]: Icons.Building2,
  [AmenityEnum.SwimmingPool]: Icons.Waves,
  [AmenityEnum.Gym]: Icons.Dumbbell,
  [AmenityEnum.Balcony]: Icons.Home,
  [AmenityEnum.Garden]: Icons.Trees,
  [AmenityEnum.CCTV]: Icons.Monitor,
  [AmenityEnum.Furnished]: Icons.Bed,
};

export const PRICE_RANGES_MIN = [1000000, 2000000, 3000000, 5000000, 10000000, 15000000, 20000000, 30000000, 50000000];
export const PRICE_RANGES_MAX = [2000000, 3000000, 5000000, 10000000, 15000000, 20000000, 30000000, 50000000, 100000000];

export const NAVBAR_HEIGHT = 52;

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
