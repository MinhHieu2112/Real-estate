"use client";

import Navbar from "@/components/Navbar";
import {
  useGetSigningPageQuery,
  useSignContractMutation,
} from "@/state/api";
import {
  AlertTriangle,
  Building,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  FileCheck,
  FileText,
  Lock,
  MapPin,
  ShieldCheck,
  User,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import React, { Suspense, useState } from "react";

function SigningContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const {
    data,
    isLoading,
    isError,
    error,
  } = useGetSigningPageQuery(token, {
    skip: !token,
  });

  const [signContract, { isLoading: isSigning }] = useSignContractMutation();

  const [agreed, setAgreed] = useState(false);
  const [signedSuccess, setSignedSuccess] = useState(false);

  if (!token) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
        <AlertTriangle className="w-12 h-12 text-amber-500 mb-3" />
        <h2 className="text-xl font-bold text-gray-900">Thiếu mã xác nhận ký hợp đồng</h2>
        <p className="text-sm text-gray-500 mt-1 max-w-md">
          Vui lòng kiểm tra email của bạn và nhấp vào liên kết ký hợp đồng được gửi từ hệ thống.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
        <Clock className="w-10 h-10 text-primary-600 animate-spin mb-3" />
        <p className="text-base font-medium text-gray-700">
          Đang xác thực liên kết ký hợp đồng (30 phút)...
        </p>
      </div>
    );
  }

  if (isError || !data?.lease) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
        <AlertTriangle className="w-12 h-12 text-rose-500 mb-3" />
        <h2 className="text-xl font-bold text-gray-900">Liên kết đã hết hạn hoặc không hợp lệ</h2>
        <p className="text-sm text-gray-500 mt-1 max-w-md">
          Liên kết ký hợp đồng này chỉ có hiệu lực trong vòng 30 phút. Vui lòng liên hệ với Quản lý bất động sản để nhận liên kết mới.
        </p>
      </div>
    );
  }

  const { lease } = data;

  const handleSign = async () => {
    if (!agreed) return;
    try {
      await signContract(token).unwrap();
      setSignedSuccess(true);
    } catch (err) {
      console.error("Lỗi khi ký hợp đồng", err);
    }
  };

  if (signedSuccess || lease.status === "Pending_payment" || lease.status === "Active") {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center max-w-lg mx-auto">
        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 mb-4 animate-bounce">
          <CheckCircle2 className="w-10 h-10" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">
          Ký hợp đồng trực tuyến thành công!
        </h1>
        <p className="text-sm text-gray-600 mt-2 leading-relaxed">
          Bạn đã hoàn tất ký hợp đồng thuê dự án <strong>{lease.property?.name}</strong>.
          Quản lý bất động sản đã nhận được thông báo và sẽ liên hệ xác nhận khoản thanh toán.
        </p>
        <div className="mt-6 flex flex-wrap gap-3 justify-center">
          <Link
            href="/tenants/applications"
            className="px-5 py-2.5 bg-primary-600 text-white text-sm font-semibold rounded-xl hover:bg-primary-700 transition-colors shadow-sm"
          >
            Về trang Quản lý đơn thuê
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 md:p-10 my-6">
      {/* Contract Banner */}
      <div className="bg-gradient-to-r from-primary-900 via-primary-800 to-indigo-900 text-white rounded-3xl p-6 md:p-8 shadow-xl mb-8">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary-200 mb-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" /> Xác thực chữ ký điện tử an toàn
        </div>
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
          Hợp đồng thuê Bất động sản
        </h1>
        <p className="text-sm text-primary-100 mt-2 max-w-2xl">
          Vui lòng kiểm tra kỹ các điều khoản hợp đồng bên dưới trước khi xác nhận ký trực tuyến.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main Document Details */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
            <h2 className="text-base font-bold text-gray-900 border-b pb-3 mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary-600" /> Nội dung hợp đồng thuê
            </h2>

            <div className="space-y-4 text-sm text-gray-700">
              <div className="bg-gray-50 p-4 rounded-xl space-y-2 border border-gray-100">
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Mã hợp đồng: #{lease.id}</span>
                  <span>Trạng thái: CHỜ KÝ</span>
                </div>
                <p className="font-semibold text-gray-900 text-base">
                  Bên cho thuê (Quản lý): {lease.property?.manager?.name || "Bất động sản"}
                </p>
                <p className="font-semibold text-gray-900 text-base">
                  Bên thuê (Khách thuê): {lease.tenant?.name} ({lease.tenant?.email})
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="border border-gray-100 p-3.5 rounded-xl">
                  <span className="text-xs text-gray-500 block mb-1">Ngày bắt đầu</span>
                  <span className="font-bold text-gray-900">
                    {new Date(lease.startDate).toLocaleDateString("vi-VN")}
                  </span>
                </div>
                <div className="border border-gray-100 p-3.5 rounded-xl">
                  <span className="text-xs text-gray-500 block mb-1">Ngày kết thúc</span>
                  <span className="font-bold text-gray-900">
                    {new Date(lease.endDate).toLocaleDateString("vi-VN")}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="border border-gray-100 p-3.5 rounded-xl">
                  <span className="text-xs text-gray-500 block mb-1">Tiền thuê hàng tháng</span>
                  <span className="font-bold text-primary-700 text-base">
                    {lease.rent?.toLocaleString("vi-VN")} VNĐ
                  </span>
                </div>
                <div className="border border-gray-100 p-3.5 rounded-xl">
                  <span className="text-xs text-gray-500 block mb-1">Tiền cọc an toàn</span>
                  <span className="font-bold text-gray-900 text-base">
                    {lease.deposit?.toLocaleString("vi-VN")} VNĐ
                  </span>
                </div>
              </div>

              {lease.leaseAgreementUrl && (
                <div className="pt-2">
                  <a
                    href={lease.leaseAgreementUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-xs font-semibold text-primary-600 bg-primary-50 hover:bg-primary-100 px-4 py-2.5 rounded-xl transition-colors"
                  >
                    <Download className="w-4 h-4" /> Tải bản hợp đồng đầy đủ (PDF)
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Signature Action Box */}
          <div className="bg-gradient-to-br from-primary-50 to-white border-2 border-primary-200 rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-primary-600" /> Xác nhận chữ ký điện tử
            </h3>

            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-1 w-4 h-4 rounded text-primary-600 focus:ring-primary-500 border-gray-300"
              />
              <span className="text-xs text-gray-700 leading-relaxed group-hover:text-gray-900">
                Tôi xác nhận rằng thông tin trên là chính xác và tôi đồng ý ký điện tử hợp đồng thuê này theo các điều khoản được quy định.
              </span>
            </label>

            <button
              onClick={handleSign}
              disabled={!agreed || isSigning}
              className="w-full py-3.5 px-6 text-sm font-bold text-white bg-primary-600 rounded-xl hover:bg-primary-700 disabled:opacity-50 transition-all shadow-md flex items-center justify-center gap-2"
            >
              <ShieldCheck className="w-5 h-5" />
              {isSigning ? "Đang xử lý chữ ký..." : "Ký hợp đồng ngay"}
            </button>
          </div>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-3">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Bất động sản thuê
            </h3>
            <div className="flex items-start gap-3">
              <Building className="w-5 h-5 text-primary-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-gray-900 text-sm">
                  {lease.property?.name}
                </p>
                <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                  <MapPin className="w-3.5 h-3.5 shrink-0" />{" "}
                  {lease.property?.location?.address}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-xs text-amber-800 space-y-2">
            <div className="font-bold flex items-center gap-1.5 text-amber-900">
              <Clock className="w-4 h-4" /> Thời gian hiệu lực liên kết
            </div>
            <p>
              Liên kết ký hợp đồng này được mã hóa bảo mật và chỉ tồn tại trong 30 phút kể từ khi khởi tạo.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TenantSignPage() {
  return (
    <div className="min-h-screen bg-gray-50/50">
      <Navbar />
      <Suspense fallback={<div className="p-8 text-center">Đang tải...</div>}>
        <SigningContent />
      </Suspense>
    </div>
  );
}
