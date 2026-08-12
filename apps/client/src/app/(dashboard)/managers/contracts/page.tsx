"use client";

import Header from "@/components/Header";
import {
  useGetManagerLeasesQuery,
  useSendContractMutation,
} from "@/state/api";
import { LeaseStatus } from "@shared/types";
import {
  CheckCircle2,
  Clock,
  Download,
  Eye,
  FileText,
  Mail,
  Send,
  User,
} from "lucide-react";
import Link from "next/link";
import React from "react";

const ManagerContractsPage = () => {
  const { data: leases, isLoading, isError } = useGetManagerLeasesQuery();
  const [sendContract, { isLoading: isSending }] = useSendContractMutation();

  const handleSendContract = async (leaseId: number) => {
    try {
      await sendContract(leaseId).unwrap();
    } catch (error) {
      console.error("Gửi hợp đồng thất bại", error);
    }
  };

  const getStatusBadge = (status: LeaseStatus) => {
    switch (status) {
      case LeaseStatus.Draft:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 bg-slate-100 text-slate-700 border border-slate-200">
            <Clock className="w-3.5 h-3.5 shrink-0" /> Bản thảo
          </span>
        );
      case LeaseStatus.Pending_signature:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 bg-amber-50 text-amber-700 border border-amber-200">
            <Mail className="w-3.5 h-3.5 shrink-0" /> Đã gửi - Chờ ký
          </span>
        );
      case LeaseStatus.Pending_payment:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 bg-purple-50 text-purple-700 border border-purple-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-purple-600 shrink-0" /> Đã ký - Chờ thanh toán
          </span>
        );
      case LeaseStatus.Active:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> Đang hiệu lực
          </span>
        );
      case LeaseStatus.Expired:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 bg-rose-50 text-rose-700 border border-rose-200">
            Hết hạn
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 bg-gray-100 text-gray-600">
            {status}
          </span>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center text-gray-500">
        Đang tải danh sách hợp đồng...
      </div>
    );
  }

  if (isError || !leases) {
    return (
      <div className="p-8 text-center text-red-500">
        Không thể tải danh sách hợp đồng. Vui lòng thử lại sau.
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <Header
        title="Quản lý hợp đồng"
        subtitle="Xem, chỉnh sửa, gửi hợp đồng và theo dõi trạng thái ký trực tuyến của người thuê."
      />

      <div className="mt-6 space-y-3">
        {leases.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center text-gray-500 shadow-sm">
            <FileText className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <p className="font-medium text-base">Chưa có hợp đồng nào</p>
            <p className="text-sm text-gray-400 mt-1">
              Hợp đồng sẽ được tự động tạo khi bạn phê duyệt đơn đăng ký thuê của người dùng.
            </p>
          </div>
        ) : (
          <>
            {/* Header hàng - chỉ hiển thị trên desktop */}
            <div className="hidden lg:grid lg:grid-cols-[60px_2fr_1.4fr_1.6fr_1.2fr_1.4fr_140px] gap-4 px-5 py-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-500">
              <span>Mã</span>
              <span>Dự án</span>
              <span>Người thuê</span>
              <span>Thời hạn</span>
              <span>Tiền thuê / Cọc</span>
              <span>Trạng thái</span>
              <span>Thao tác</span>
            </div>

            {leases.map((lease) => (
              <div
                key={lease.id}
                className="bg-white border border-gray-200 rounded-2xl shadow-sm hover:border-gray-300 hover:shadow-md transition-all"
              >
                {/* Desktop layout */}
                <div className="hidden lg:grid lg:grid-cols-[60px_2fr_1.4fr_1.6fr_1.2fr_1.4fr_140px] gap-4 items-center px-5 py-4">
                  <span className="font-bold text-gray-900 text-sm">#{lease.id}</span>

                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 truncate text-sm">
                      {lease.property?.name || `Dự án #${lease.propertyId}`}
                    </p>
                    <p className="text-xs text-gray-400 truncate mt-0.5">
                      {lease.property?.location?.address || ""}
                    </p>
                  </div>

                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 truncate text-sm">
                      {lease.tenant?.name || "N/A"}
                    </p>
                    <p className="text-xs text-gray-400 truncate mt-0.5">
                      {lease.tenant?.email}
                    </p>
                  </div>

                  <div className="text-xs text-gray-600">
                    <span>{new Date(lease.startDate).toLocaleDateString("vi-VN")}</span>
                    <span className="mx-1 text-gray-300">→</span>
                    <span>{new Date(lease.endDate).toLocaleDateString("vi-VN")}</span>
                  </div>

                  <div>
                    <p className="font-semibold text-gray-900 text-sm">
                      {lease.rent?.toLocaleString("vi-VN")} VNĐ
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Cọc: {lease.deposit?.toLocaleString("vi-VN")} VNĐ
                    </p>
                  </div>

                  <div>{getStatusBadge(lease.status)}</div>

                  <div className="flex items-center gap-2">
                    <Link
                      href={`/managers/contracts/${lease.id}`}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-primary-700 bg-primary-50 border border-primary-200 rounded-lg hover:bg-primary-100 transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </Link>

                    {lease.status === LeaseStatus.Draft && (
                      <button
                        onClick={() => handleSendContract(lease.id)}
                        disabled={isSending}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors shadow-sm"
                      >
                        <Send className="w-3.5 h-3.5" /> Gửi
                      </button>
                    )}

                    {lease.status === LeaseStatus.Pending_signature && (
                      <button
                        onClick={() => handleSendContract(lease.id)}
                        disabled={isSending}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 disabled:opacity-50 transition-colors"
                      >
                        <Send className="w-3.5 h-3.5" /> 
                      </button>
                    )}

                    {lease.leaseAgreementUrl && (
                      <a
                        href={lease.leaseAgreementUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center px-2.5 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 border border-gray-200 rounded-lg hover:bg-gray-200 transition-colors"
                        title="Tải PDF hợp đồng"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>

                {/* Mobile / Tablet layout */}
                <div className="lg:hidden p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-bold text-gray-400">#{lease.id}</span>
                        <p className="font-semibold text-gray-900 text-sm truncate">
                          {lease.property?.name || `Dự án #${lease.propertyId}`}
                        </p>
                      </div>
                      <p className="text-xs text-gray-400 truncate">
                        {lease.property?.location?.address}
                      </p>
                    </div>
                    {getStatusBadge(lease.status)}
                  </div>

                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <User className="w-4 h-4 text-gray-400 shrink-0" />
                    <span className="truncate">{lease.tenant?.name}</span>
                    <span className="text-gray-400 text-xs truncate">{lease.tenant?.email}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-100 text-sm">
                    <div>
                      <p className="text-xs text-gray-400">Thời hạn</p>
                      <p className="text-xs font-medium text-gray-700 mt-0.5">
                        {new Date(lease.startDate).toLocaleDateString("vi-VN")} →{" "}
                        {new Date(lease.endDate).toLocaleDateString("vi-VN")}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Tiền thuê</p>
                      <p className="font-semibold text-gray-900 text-sm mt-0.5">
                        {lease.rent?.toLocaleString("vi-VN")} VNĐ
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <Link
                      href={`/managers/contracts/${lease.id}`}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-primary-700 bg-primary-50 border border-primary-200 rounded-lg hover:bg-primary-100 transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" /> Chi tiết
                    </Link>

                    {lease.status === LeaseStatus.Draft && (
                      <button
                        onClick={() => handleSendContract(lease.id)}
                        disabled={isSending}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors shadow-sm"
                      >
                        <Send className="w-3.5 h-3.5" /> Gửi hợp đồng
                      </button>
                    )}

                    {lease.status === LeaseStatus.Pending_signature && (
                      <button
                        onClick={() => handleSendContract(lease.id)}
                        disabled={isSending}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors"
                      >
                        <Send className="w-3.5 h-3.5" /> 
                      </button>
                    )}

                    {lease.leaseAgreementUrl && (
                      <a
                        href={lease.leaseAgreementUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 border border-gray-200 rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" /> PDF
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
};

export default ManagerContractsPage;
