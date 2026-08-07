import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AmenityIcons, HighlightIcons } from "@/lib/constants";
import { useGetPropertyQuery } from "@/state/api";
import { AmenityEnum, HighlightEnum, AmenityLabels, HighlightLabels } from "@shared/types";
import { HelpCircle } from "lucide-react";
import React from "react";

interface PropertyDetailsProps {
  propertyId: number;
}

const PropertyDetails = ({ propertyId }: PropertyDetailsProps) => {
  const {
    data: property,
    isError,
    isLoading,
  } = useGetPropertyQuery(propertyId);

  if (isLoading) return <>Đang tải...</>;
  if (isError || !property) {
    return <>Không tìm thấy dự án</>;
  }

  return (
    <div className="mb-6">
      {/* Amenities */}
      <div>
        <h2 className="text-xl font-semibold my-3">Tiện ích dự án</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
          {property.amenities.map((amenity) => {
            const Icon = AmenityIcons[amenity as AmenityEnum] || HelpCircle;
            return (
              <div
                key={amenity}
                className="flex flex-col items-center border rounded-xl py-8 px-4"
              >
                <Icon className="w-8 h-8 mb-2 text-gray-700" />
                <span className="text-sm text-center text-gray-700">
                  {AmenityLabels[amenity as AmenityEnum] || amenity}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Highlights */}
      <div className="mt-12 mb-16">
        <h3 className="text-xl font-semibold text-primary-800 dark:text-primary-100">
          Điểm nổi bật
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8 mt-4 w-full">
          {property.highlights.map((highlight) => {
            const Icon =
              HighlightIcons[highlight as HighlightEnum] || HelpCircle;
            return (
              <div
                key={highlight}
                className="flex flex-col items-center border rounded-xl py-8 px-4"
              >
                <Icon className="w-8 h-8 mb-2 text-primary-600 dark:text-primary-300" />
                <span className="text-sm text-center text-primary-600 dark:text-primary-300">
                  {HighlightLabels[highlight as HighlightEnum] || highlight}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tabs Section */}
      <div>
        <h3 className="text-xl font-semibold text-primary-800 dark:text-primary-100 mb-5">
          Phí và quy định
        </h3>
        <p className="text-sm text-primary-600 dark:text-primary-300 mt-2">
          Các khoản phí bên dưới được tổng hợp từ thông tin thực tế và có thể chưa bao gồm các khoản phí phụ phát sinh.
        </p>
        <Tabs defaultValue="required-fees" className="mt-8">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="required-fees">Phí bắt buộc</TabsTrigger>
            <TabsTrigger value="pets">Thú cưng</TabsTrigger>
            <TabsTrigger value="parking">Chỗ đỗ xe</TabsTrigger>
          </TabsList>
          <TabsContent value="required-fees" className="w-1/3">
            <p className="font-semibold mt-5 mb-2">Phí chuyển vào một lần</p>
            <hr />
            <div className="flex justify-between py-2 bg-secondary-50">
              <span className="text-primary-700 font-medium">
                Phí đăng ký
              </span>
              <span className="text-primary-700">
                {property.applicationFee} VNĐ
              </span>
            </div>
            <hr />
            <div className="flex justify-between py-2 bg-secondary-50">
              <span className="text-primary-700 font-medium">
                Tiền cọc an toàn
              </span>
              <span className="text-primary-700">
                {property.securityDeposit} VNĐ
              </span>
            </div>
            <hr />
          </TabsContent>
          <TabsContent value="pets">
            <p className="font-semibold mt-5 mb-2">
              Quy định thú cưng: {property.isPetsAllowed ? "Cho phép nuôi thú cưng" : "Không cho phép nuôi thú cưng"}
            </p>
          </TabsContent>
          <TabsContent value="parking">
            <p className="font-semibold mt-5 mb-2">
              Chỗ đỗ xe:{" "}
              {property.isParkingIncluded ? "Đã bao gồm chỗ đỗ xe" : "Không bao gồm chỗ đỗ xe"}
            </p>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default PropertyDetails;