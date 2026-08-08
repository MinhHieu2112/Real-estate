"use client";

import Header from "@/components/Header";
import {
  useGetLeaseDetailQuery,
  useSendContractMutation,
  useUpdateLeaseContentMutation,
} from "@/state/api";
import { Lease, LeaseStatus } from "@shared/types";
import {
  ArrowLeft,
  Building,
  Clock,
  Download,
  FileText,
  Lock,
  Mail,
  MapPin,
  Save,
  Send,
  ShieldCheck,
  User,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";

interface ContractFormProps {
  lease: Lease;
  leaseId: number;
}

const ContractForm = ({ lease, leaseId }: ContractFormProps) => {
  const [updateLeaseContent, { isLoading: isUpdating }] =
    useUpdateLeaseContentMutation();
  const [sendContract, { isLoading: isSending }] = useSendContractMutation();

  const [startDate, setStartDate] = useState(
    lease.startDate
      ? new Date(lease.startDate).toISOString().split("T")[0]
      : ""
  );
  const [endDate, setEndDate] = useState(
    lease.endDate ? new Date(lease.endDate).toISOString().split("T")[0] : ""
  );
  const [rent, setRent] = useState(lease.rent || 0);
  const [deposit, setDeposit] = useState(lease.deposit || 0);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateLeaseContent({
        id: leaseId,
        startDate,
        endDate,
        rent,
        deposit,
      }).unwrap();
    } catch (err) {
      console.error("Cập nhật thất bại", err);
    }
  };

  const handleSend = async () => {
    try {
      await sendContract(leaseId).unwrap();
    } catch (err) {
      console.error("Gửi hợp đồng thất bại", err);
    }
  };

  const isEditable = lease.status === LeaseStatus.Draft;

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
      <div className="flex items-center justify-between border-b pb-4 mb-6">
        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary-600" /> Điều khoản hợp đồng
        </h2>
        {isEditable ? (
          <span className="text-xs text-amber-600 bg-amber-50 px-2.5 py-1 rounded-md font-medium flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" /> Có thể chỉnh sửa (DRAFT)
          </span>
        ) : (
          <span className="text-xs text-gray-600 bg-gray-100 px-2.5 py-1 rounded-md font-medium flex items-center gap-1">
            <Lock className="w-3.5 h-3.5" /> Đã khóa chỉnh sửa
          </span>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase mb-1.5">
              Ngày bắt đầu thuê
            </label>
            <input
              type="date"
              disabled={!isEditable}
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-3.5 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-50 disabled:text-gray-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase mb-1.5">
              Ngày kết thúc thuê
            </label>
            <input
              type="date"
              disabled={!isEditable}
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-3.5 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-50 disabled:text-gray-600"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase mb-1.5">
              Tiền thuê (VNĐ)
            </label>
            <input
              type="number"
              disabled={!isEditable}
              value={rent}
              onChange={(e) => setRent(Number(e.target.value))}
              className="w-full border border-gray-300 rounded-xl px-3.5 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-50 disabled:text-gray-600 font-semibold"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase mb-1.5">
              Tiền cọc an toàn (VNĐ)
            </label>
            <input
              type="number"
              disabled={!isEditable}
              value={deposit}
              onChange={(e) => setDeposit(Number(e.target.value))}
              className="w-full border border-gray-300 rounded-xl px-3.5 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-50 disabled:text-gray-600 font-semibold"
            />
          </div>
        </div>

        {isEditable && (
          <div className="pt-4 flex items-center justify-end gap-3 border-t">
            <button
              type="submit"
              disabled={isUpdating}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 disabled:opacity-50 transition-colors"
            >
              <Save className="w-4 h-4" /> Lưu thay đổi
            </button>

            <button
              type="button"
              onClick={handleSend}
              disabled={isSending}
              className="inline-flex items-center gap-1.5 px-5 py-2 text-sm font-semibold text-white bg-primary-600 rounded-xl hover:bg-primary-700 disabled:opacity-50 transition-colors shadow-sm"
            >
              <Send className="w-4 h-4" /> Gửi hợp đồng cho Tenant
            </button>
          </div>
        )}
      </form>
    </div>
  );
};

const ContractDetailPage = () => {
  const params = useParams();
  const leaseId = Number(params?.id);

  const { data: lease, isLoading, isError } = useGetLeaseDetailQuery(leaseId, {
    skip: !leaseId,
  });

  if (isLoading) {
    return <div className="p-8 text-center text-gray-500">Đang tải chi tiết hợp đồng...</div>;
  }

  if (isError || !lease) {
    return (
      <div className="p-8 text-center text-red-500">
        Không tìm thấy hợp đồng.
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      <Link
        href="/managers/contracts"
        className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Quay lại danh sách hợp đồng
      </Link>

      <Header
        title={`Hợp đồng #${lease.id}`}
        subtitle={`Chi tiết điều khoản và trạng thái của hợp đồng thuê.`}
      />

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Contract Editor / View */}
        <div className="lg:col-span-2 space-y-6">
          <ContractForm key={lease.id} lease={lease} leaseId={leaseId} />

          {/* Electronic Audit Trail (If signed) */}
          {(lease.tenantSignedAt || lease.managerSignedAt) && (
            <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-6 shadow-sm">
              <h3 className="text-sm font-bold text-emerald-900 flex items-center gap-2 mb-3">
                <ShieldCheck className="w-5 h-5 text-emerald-600" /> Nhật ký chữ ký điện tử
              </h3>
              <div className="space-y-2 text-xs text-emerald-800">
                {lease.tenantSignedAt && (
                  <p>
                    ✓ <strong>Người thuê ({lease.tenant?.name}):</strong> Ký lúc{" "}
                    {new Date(lease.tenantSignedAt).toLocaleString("vi-VN")} (IP:{" "}
                    {lease.tenantSignedIp || "127.0.0.1"})
                  </p>
                )}
                {lease.managerSignedAt && (
                  <p>
                    ✓ <strong>Quản lý:</strong> Xác nhận thanh toán lúc{" "}
                    {new Date(lease.managerSignedAt).toLocaleString("vi-VN")}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar Info Cards */}
        <div className="space-y-6">
          {/* Property Card */}
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-3">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Dự án bất động sản
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

          {/* Tenant Card */}
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-3">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Người thuê (Tenant)
            </h3>
            <div className="flex items-start gap-3">
              <User className="w-5 h-5 text-gray-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-gray-900 text-sm">
                  {lease.tenant?.name}
                </p>
                <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                  <Mail className="w-3.5 h-3.5 shrink-0" /> {lease.tenant?.email}
                </p>
              </div>
            </div>
          </div>

          {/* Action Download */}
          {lease.leaseAgreementUrl && (
            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
              <a
                href={lease.leaseAgreementUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
              >
                <Download className="w-4 h-4" /> Xem / Tải hợp đồng PDF
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ContractDetailPage;
