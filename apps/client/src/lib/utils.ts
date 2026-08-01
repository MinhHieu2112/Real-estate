import { clsx, type ClassValue } from "clsx";
import { toast } from "sonner";
import { twMerge } from "tailwind-merge";
import { AmenityViNames, HighlightViNames, AmenityEnum, HighlightEnum } from "@/lib/constants";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatEnumString(str: string) {
  if (AmenityViNames[str as AmenityEnum]) {
    return AmenityViNames[str as AmenityEnum];
  }
  if (HighlightViNames[str as HighlightEnum]) {
    return HighlightViNames[str as HighlightEnum];
  }
  return str.replace(/([A-Z])/g, " $1").trim();
}

export function cleanParams(params: Record<string, any>): Record<string, any> {
  return Object.fromEntries(
    Object.entries(params).filter(
      ([_, value]) => 
        value !== undefined &&
        value !== "any" &&
        value !== "" &&
        (Array.isArray(value) ? value.some((v) => v !== null) : value !== null)
    )
  );
}

type MutationMessages = {
  success: string;
  error: string;
};

export const withToast = async <T>(
  mutationFn: Promise<T>,
  messages: Partial<MutationMessages>
) => {
  const  { success, error } = messages;

  try {
    const result = await mutationFn;
    if (success) toast.success(success);
    return result;
  } catch (err) {
    if (error) toast.error(error);
  }
}

export function formatPriceValue(value: number | null, isMin: boolean) {
  if (value === null || value === 0)
    return isMin ? "Giá tối thiểu" : "Giá tối đa";

  if (value >= 1_000_000) {
    const millions = (value / 1_000_000).toLocaleString('vi-VN', { maximumFractionDigits: 1 });
    return isMin ? `${millions} triệu+` : `< ${millions} triệu`;
  }
  return isMin ? `${value.toLocaleString('vi-VN')} VNĐ+` : `< ${value.toLocaleString('vi-VN')} VNĐ`;
}

export const createNewUserInDatabase = async (
  user: any,
  idToken: any,
  userRole: string,
  fetchWithBQ: any
) => {
  const createEndpoint =
    userRole?.toLowerCase() === "manager" ? "/managers" : "/tenants";

  const createUserResponse = await fetchWithBQ({
    url: createEndpoint,
    method: "POST",
    body: {
      cognitoId: user.userId,
      name: user.username,
      email: idToken?.payload?.email || "",
      phoneNumber: "",
    },
  });

  if (createUserResponse.error) {
    throw new Error("Không thể tạo thông tin người dùng");
  }

  return createUserResponse;
};
