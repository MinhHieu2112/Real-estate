"use client";

import Header from "@/components/Header";
import {
  useGetManagerLeasesQuery,
  useSendContractMutation,
} from "@/state/api";
import { LeaseStatus } from "@shared/types";
import {
  Building,
  Calendar,
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
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <Header
        title="Quản lý Hợp đồng"
        subtitle="Xem, chỉnh sửa, gửi hợp đồng và theo dõi trạng thái ký trực tuyến của người thuê."
      />

      <div className="mt-6 bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        {leases.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <FileText className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <p className="font-medium text-base">Chưa có hợp đồng nào</p>
            <p className="text-sm text-gray-400 mt-1">
              Hợp đồng sẽ được tự động tạo khi bạn phê duyệt đơn đăng ký thuê của người dùng.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse align-middle">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-200 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  <th className="py-4 px-6 whitespace-nowrap">Mã HĐ</th>
                  <th className="py-4 px-6 min-w-[200px]">Dự án</th>
                  <th className="py-4 px-6 min-w-[180px]">Người thuê</th>
                  <th className="py-4 px-6 whitespace-nowrap">Thời hạn</th>
                  <th className="py-4 px-6 whitespace-nowrap">Tiền thuê / Cọc</th>
                  <th className="py-4 px-6 whitespace-nowrap">Trạng thái</th>
                  <th className="py-4 px-6 text-right whitespace-nowrap">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
                {leases.map((lease) => (
                  <tr
                    key={lease.id}
                    className="hover:bg-gray-50/60 transition-colors"
                  >
                    <td className="py-4 px-6 font-semibold text-gray-900 whitespace-nowrap">
                      #{lease.id}
                    </td>
                    <td className="py-4 px-6 max-w-xs">
                      <div className="font-medium text-gray-900 truncate flex items-center gap-2">
                        <Building className="w-4 h-4 text-primary-600 shrink-0" />
                        <span>{lease.property?.name || `Dự án #${lease.propertyId}`}</span>
                      </div>
                      <p className="text-xs text-gray-500 truncate mt-0.5">
                        {lease.property?.location?.address || ""}
                      </p>
                    </td>
                    <td className="py-4 px-6">
                      <div className="font-medium text-gray-900 flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-400 shrink-0" />
                        <span>{lease.tenant?.name || "N/A"}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {lease.tenant?.email}
                      </p>
                    </td>
                    <td className="py-4 px-6 text-xs text-gray-600 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <span>
                          {new Date(lease.startDate).toLocaleDateString("vi-VN")} -{" "}
                          {new Date(lease.endDate).toLocaleDateString("vi-VN")}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-6 whitespace-nowrap">
                      <div className="font-semibold text-gray-900">
                        {lease.rent?.toLocaleString("vi-VN")} VNĐ
                      </div>
                      <div className="text-xs text-gray-500">
                        Cọc: {lease.deposit?.toLocaleString("vi-VN")} VNĐ
                      </div>
                    </td>
                    <td className="py-4 px-6 whitespace-nowrap">
                      {getStatusBadge(lease.status)}
                    </td>
                    <td className="py-4 px-6 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
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
                            <Send className="w-3.5 h-3.5" /> Gửi HĐ
                          </button>
                        )}

                        {lease.status === LeaseStatus.Pending_signature && (
                          <button
                            onClick={() => handleSendContract(lease.id)}
                            disabled={isSending}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 disabled:opacity-50 transition-colors"
                          >
                            <Send className="w-3.5 h-3.5" /> Gửi lại
                          </button>
                        )}

                        {lease.leaseAgreementUrl && (
                          <a
                            href={lease.leaseAgreementUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 border border-gray-200 rounded-lg hover:bg-gray-200 transition-colors"
                            title="Tải PDF Hợp đồng"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ManagerContractsPage;
