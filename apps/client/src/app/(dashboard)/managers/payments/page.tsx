"use client";

import Header from "@/components/Header";
import {
  useConfirmPaymentMutation,
  useGetManagerPaymentsQuery,
} from "@/state/api";
import { Lease, Payment, PaymentStatus } from "@shared/types";
import {
  AlertCircle,
  Building,
  CheckCircle2,
  Clock,
  CreditCard,
  DollarSign,
  User,
  X,
} from "lucide-react";
import React, { useState } from "react";

const ManagerPaymentsPage = () => {
  const { data: leases, isLoading, isError } = useGetManagerPaymentsQuery();
  const [confirmPayment, { isLoading: isConfirming }] = useConfirmPaymentMutation();

  const [selectedLease, setSelectedLease] = useState<Lease | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [newStatus, setNewStatus] = useState<PaymentStatus>(PaymentStatus.Paid);
  const [amountPaid, setAmountPaid] = useState<number>(0);

  const openConfirmModal = (lease: Lease, payment: Payment) => {
    setSelectedLease(lease);
    setSelectedPayment(payment);
    setNewStatus(PaymentStatus.Paid);
    setAmountPaid(payment.amountDue);
  };

  const handleConfirmPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLease || !selectedPayment) return;

    try {
      await confirmPayment({
        leaseId: selectedLease.id,
        paymentId: selectedPayment.id,
        paymentStatus: newStatus,
        amountPaid: amountPaid,
      }).unwrap();
      setSelectedLease(null);
      setSelectedPayment(null);
    } catch (err) {
      console.error("Xác nhận thanh toán thất bại", err);
    }
  };

  const getPaymentBadge = (status: PaymentStatus) => {
    switch (status) {
      case PaymentStatus.Paid:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> Đã thanh toán
          </span>
        );
      case PaymentStatus.Pending:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3.5 h-3.5 shrink-0" /> Chờ thanh toán
          </span>
        );
      case PaymentStatus.PartiallyPaid:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 bg-blue-50 text-blue-700 border border-blue-200">
            <DollarSign className="w-3.5 h-3.5 shrink-0" /> Thanh toán một phần
          </span>
        );
      case PaymentStatus.Overdue:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 bg-rose-50 text-rose-700 border border-rose-200">
            <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" /> Quá hạn
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
    return <div className="p-8 text-center text-gray-500">Đang tải danh sách thanh toán...</div>;
  }

  if (isError || !leases) {
    return (
      <div className="p-8 text-center text-red-500">
        Không thể tải danh sách thanh toán. Vui lòng thử lại sau.
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <Header
        title="Quản lý Thanh toán"
        subtitle="Theo dõi và xác nhận các khoản thanh toán tiền cọc, tiền thuê từ người dùng."
      />

      <div className="mt-6 bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        {leases.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <CreditCard className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <p className="font-medium text-base">Chưa có khoản thanh toán nào cần xử lý</p>
            <p className="text-sm text-gray-400 mt-1">
              Danh sách thanh toán sẽ xuất hiện sau khi người thuê thực hiện ký hợp đồng.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse align-middle">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-200 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  <th className="py-4 px-6 whitespace-nowrap">Hợp đồng</th>
                  <th className="py-4 px-6 min-w-[200px]">Dự án</th>
                  <th className="py-4 px-6 min-w-[180px]">Người thuê</th>
                  <th className="py-4 px-6 whitespace-nowrap">Cần thanh toán</th>
                  <th className="py-4 px-6 whitespace-nowrap">Hạn thanh toán</th>
                  <th className="py-4 px-6 whitespace-nowrap">Trạng thái</th>
                  <th className="py-4 px-6 text-right whitespace-nowrap">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
                {leases.flatMap((lease) =>
                  (lease.payments || []).map((payment) => (
                    <tr
                      key={`${lease.id}-${payment.id}`}
                      className="hover:bg-gray-50/60 transition-colors"
                    >
                      <td className="py-4 px-6 font-semibold text-gray-900 whitespace-nowrap">
                        #{lease.id}
                      </td>
                      <td className="py-4 px-6 max-w-xs">
                        <div className="font-medium text-gray-900 truncate flex items-center gap-2">
                          <Building className="w-4 h-4 text-primary-600 shrink-0" />
                          <span>{lease.property?.name}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="font-medium text-gray-900 flex items-center gap-2">
                          <User className="w-4 h-4 text-gray-400 shrink-0" />
                          <span>{lease.tenant?.name}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6 whitespace-nowrap">
                        <div className="font-semibold text-gray-900">
                          {payment.amountDue.toLocaleString("vi-VN")} VNĐ
                        </div>
                        {payment.amountPaid > 0 && (
                          <div className="text-xs text-emerald-600 font-medium">
                            Đã nhận: {payment.amountPaid.toLocaleString("vi-VN")} VNĐ
                          </div>
                        )}
                      </td>
                      <td className="py-4 px-6 text-xs text-gray-600 whitespace-nowrap">
                        {new Date(payment.dueDate).toLocaleDateString("vi-VN")}
                      </td>
                      <td className="py-4 px-6 whitespace-nowrap">
                        {getPaymentBadge(payment.paymentStatus)}
                      </td>
                      <td className="py-4 px-6 text-right whitespace-nowrap">
                        {payment.paymentStatus !== PaymentStatus.Paid ? (
                          <button
                            onClick={() => openConfirmModal(lease, payment)}
                            className="inline-flex items-center gap-1 px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors shadow-sm"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" /> Xác nhận
                          </button>
                        ) : (
                          <span className="text-xs text-gray-400 font-medium">
                            Đã hoàn tất
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {selectedLease && selectedPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl relative animate-in fade-in zoom-in duration-200">
            <button
              onClick={() => {
                setSelectedLease(null);
                setSelectedPayment(null);
              }}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-gray-900 mb-1">
              Xác nhận khoản thanh toán
            </h3>
            <p className="text-xs text-gray-500 mb-5">
              Hợp đồng #{selectedLease.id} - Dự án {selectedLease.property?.name}
            </p>

            <form onSubmit={handleConfirmPayment} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Số tiền cần nộp (VNĐ)
                </label>
                <input
                  type="text"
                  disabled
                  value={selectedPayment.amountDue.toLocaleString("vi-VN")}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2 text-sm font-semibold text-gray-700"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Số tiền đã nhận thực tế (VNĐ)
                </label>
                <input
                  type="number"
                  required
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(Number(e.target.value))}
                  className="w-full border border-gray-300 rounded-xl px-3.5 py-2 text-sm font-semibold focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Trạng thái thanh toán
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as PaymentStatus)}
                  className="w-full border border-gray-300 rounded-xl px-3.5 py-2 text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                >
                  <option value={PaymentStatus.Paid}>Đã thanh toán (Paid)</option>
                  <option value={PaymentStatus.PartiallyPaid}>
                    Thanh toán một phần (Partially Paid)
                  </option>
                  <option value={PaymentStatus.Pending}>Chờ thanh toán (Pending)</option>
                  <option value={PaymentStatus.Overdue}>Quá hạn (Overdue)</option>
                </select>
              </div>

              <div className="pt-3 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedLease(null);
                    setSelectedPayment(null);
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isConfirming}
                  className="px-5 py-2 text-sm font-semibold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 disabled:opacity-50 transition-colors shadow-sm"
                >
                  Xác nhận ngay
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManagerPaymentsPage;
