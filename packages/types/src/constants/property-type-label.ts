import { PropertyTypeEnum } from "../enums/property-type.enum";

export const PropertyTypeLabels: Record<PropertyTypeEnum, string> = {
  [PropertyTypeEnum.Rooms]: "Phòng trọ",
  [PropertyTypeEnum.Tinyhouse]: "Nhà mini",
  [PropertyTypeEnum.Apartment]: "Căn hộ chung cư",
  [PropertyTypeEnum.Villa]: "Biệt thự",
  [PropertyTypeEnum.Townhouse]: "Nhà phố",
  [PropertyTypeEnum.Cottage]: "Nhà vườn",
};
