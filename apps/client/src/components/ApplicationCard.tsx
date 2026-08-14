import { Mail, MapPin, PhoneCall } from "lucide-react";
import Image from "next/image";
import React, { useState } from "react";

const ApplicationCard = ({
  application,
  userType,
  children,
}: ApplicationCardProps) => {
  const [imgSrc, setImgSrc] = useState(
    application.property?.photoUrls?.[0] || "/placeholder.jpg"
  );

  const statusBadge =
    application.status === "Approved"
      ? "bg-green-100 text-green-700 border-green-200"
      : application.status === "Denied"
      ? "bg-red-100 text-red-700 border-red-200"
      : "bg-amber-100 text-amber-700 border-amber-200";

  return (
    <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-sm bg-white mb-5 transition-all hover:shadow-md">
      <div className="grid grid-cols-1 lg:grid-cols-12 p-5 gap-6 items-stretch">
        {/* Property Info Section */}
        <div className="lg:col-span-5 flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <div className="relative w-full sm:w-[180px] h-[120px] rounded-xl overflow-hidden shrink-0 bg-gray-100">
            <Image
              src={imgSrc}
              alt={application.property?.name || "Property Image"}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 180px"
              onError={() => setImgSrc("/placeholder.jpg")}
            />
          </div>
          <div className="flex flex-col justify-between py-1 min-w-0">
            <div>
              <h2 className="text-lg font-bold text-gray-900 truncate my-1">
                {application.property?.name || "Property"}
              </h2>
              <div className="flex items-center text-gray-500 text-sm mb-2">
                <MapPin className="w-4 h-4 mr-1 text-gray-400 shrink-0" />
                <span className="truncate">
                  {application.property?.location?.city ? `${application.property.location.city}, ${application.property.location.country}` : "Address unavailable"}
                </span>
              </div>
            </div>
            <div className="text-base font-bold text-primary-700">
              {application.property?.pricePerMonth?.toLocaleString("vi-VN")}{" "}
              <span className="text-xs font-normal text-gray-500">VNĐ / ngày</span>
            </div>
          </div>
        </div>

        {/* Status & Dates Section */}
        <div className="lg:col-span-4 flex flex-col justify-between border-t lg:border-t-0 lg:border-l border-gray-100 pt-4 lg:pt-0 lg:pl-6 gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Trạng thái:</span>
            <span className={`px-2.5 py-0.5 border rounded-full text-xs font-semibold ${statusBadge}`}>
              {application.status === "Approved" ? "Đã duyệt" : application.status === "Denied" ? "Đã từ chối" : "Chờ duyệt"}
            </span>
          </div>
          <div className="space-y-1.5 text-xs text-gray-600 mt-2">
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Ngày bắt đầu:</span>
              <span className="font-medium text-gray-800">
                {application.lease?.startDate
                  ? new Date(application.lease.startDate).toLocaleDateString('vi-VN')
                  : application.startDate
                  ? new Date(application.startDate).toLocaleDateString('vi-VN')
                  : "Không xác định"}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Ngày kết thúc:</span>
              <span className="font-medium text-gray-800">
                {application.lease?.endDate
                  ? new Date(application.lease.endDate).toLocaleDateString('vi-VN')
                  : "Cuối tháng"}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Tình trạng:</span>
              <span className="font-medium text-gray-800">
                {application.lease?.nextPaymentDate
                  ? new Date(application.lease.nextPaymentDate).toLocaleDateString('vi-VN')
                  : application.lease?.status === "Active"
                  ? "Không xác định"
                  : "Chưa có hợp đồng"
                }
              </span>
            </div>
          </div>
        </div>

        {/* Contact Person Section */}
        <div className="lg:col-span-3 flex flex-col justify-between border-t lg:border-t-0 lg:border-l border-gray-100 pt-4 lg:pt-0 lg:pl-6">
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
            {userType === "manager" ? "Người thuê" : "Quản lý"}
          </div>
          <div className="flex items-center gap-3">
            <Image
              src="/landing-i1.png"
              alt={application.name || "Người liên hệ"}
              width={38}
              height={38}
              className="rounded-full shrink-0 border border-gray-200"
            />
            <div className="min-w-0 text-xs space-y-0.5">
              <div className="font-medium text-gray-800 truncate">{application.name || "Người liên hệ"}</div>
              <div className="flex items-center text-gray-500 truncate">
                <PhoneCall className="w-3.5 h-3.5 mr-1 shrink-0 text-gray-400" />
                <span className="truncate">{application.phoneNumber || "Không xác định"}</span>
              </div>
              <div className="flex items-center text-gray-500 truncate">
                <Mail className="w-3.5 h-3.5 mr-1 shrink-0 text-gray-400" />
                <span className="truncate">{application.email || "Không xác định"}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {children && (
        <div className="border-t border-gray-100 bg-gray-50/50 p-4">
          {children}
        </div>
      )}
    </div>
  );
};

export default ApplicationCard;