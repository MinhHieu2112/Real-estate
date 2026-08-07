import { PropertyStatusEnum } from "../enums/property-status.enum";

export const PropertyStatusLabels: Record<PropertyStatusEnum, string> = {
  [PropertyStatusEnum.Available]: "Đang hoạt động",
  [PropertyStatusEnum.Rented]: "Đang cho thuê",
  [PropertyStatusEnum.Maintenance]: "Đang bảo trì"
};