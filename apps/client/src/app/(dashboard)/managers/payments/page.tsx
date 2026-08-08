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
    <div className="dashboard-container">
      <Header
        title="Quản lý thanh toán"
        subtitle="Theo dõi và xác nhận các khoản thanh toán tiền cọc, tiền thuê từ người dùng."
      />

      <div className="mt-6 space-y-3">
        {leases.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center text-gray-500 shadow-sm">
            <CreditCard className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <p className="font-medium text-base">Chưa có khoản thanh toán nào cần xử lý</p>
            <p className="text-sm text-gray-400 mt-1">
              Danh sách thanh toán sẽ xuất hiện sau khi người thuê thực hiện ký hợp đồng.
            </p>
          </div>
        ) : (
          <>
            {/* Header hàng - chỉ hiển thị trên desktop */}
            <div className="hidden lg:grid lg:grid-cols-[60px_2fr_1.4fr_1.2fr_1.2fr_1.4fr_140px] gap-4 px-5 py-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-500">
              <span>Mã</span>
              <span>Dự án</span>
              <span>Người thuê</span>
              <span>Cần thanh toán</span>
              <span>Hạn thanh toán</span>
              <span>Trạng thái</span>
              <span>Thao tác</span>
            </div>

            {leases.flatMap((lease) =>
              (lease.payments || []).map((payment) => (
                <div
                  key={`${lease.id}-${payment.id}`}
                  className="bg-white border border-gray-200 rounded-2xl shadow-sm hover:border-gray-300 hover:shadow-md transition-all"
                >
                  {/* Desktop layout */}
                  <div className="hidden lg:grid lg:grid-cols-[60px_2fr_1.4fr_1.2fr_1.2fr_1.4fr_140px] gap-4 items-center px-5 py-4">
                    <span className="font-bold text-gray-900 text-sm">#{lease.id}</span>

                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 truncate text-sm">
                        {lease.property?.name}
                      </p>
                      <p className="text-xs text-gray-400 truncate mt-0.5">
                        {lease.property?.location?.address || ""}
                      </p>
                    </div>

                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 truncate text-sm">
                        {lease.tenant?.name}
                      </p>
                      <p className="text-xs text-gray-400 truncate mt-0.5">
                        {lease.tenant?.email}
                      </p>
                    </div>

                    <div>
                      <p className="font-semibold text-gray-900 text-sm">
                        {payment.amountDue.toLocaleString("vi-VN")} VNĐ
                      </p>
                    </div>

                    <div className="text-sm text-gray-600">
                      {new Date(payment.dueDate).toLocaleDateString("vi-VN")}
                    </div>

                    <div>{getPaymentBadge(payment.paymentStatus)}</div>

                    <div className="flex items-center gap-2">
                      {payment.paymentStatus !== PaymentStatus.Paid ? (
                        <button
                          onClick={() => openConfirmModal(lease, payment)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors shadow-sm"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> Xác nhận
                        </button>
                      ) : (
                        <span className="text-xs text-gray-400 font-medium">Đã hoàn tất</span>
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
                            {lease.property?.name}
                          </p>
                        </div>
                        <p className="text-xs text-gray-400 truncate">
                          {lease.property?.location?.address}
                        </p>
                      </div>
                      {getPaymentBadge(payment.paymentStatus)}
                    </div>

                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <User className="w-4 h-4 text-gray-400 shrink-0" />
                      <span className="truncate">{lease.tenant?.name}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-100">
                      <div>
                        <p className="text-xs text-gray-400">Cần thanh toán</p>
                        <p className="font-semibold text-gray-900 text-sm mt-0.5">
                          {payment.amountDue.toLocaleString("vi-VN")} VNĐ
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Hạn thanh toán</p>
                        <p className="text-sm text-gray-700 mt-0.5">
                          {new Date(payment.dueDate).toLocaleDateString("vi-VN")}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      {payment.paymentStatus !== PaymentStatus.Paid ? (
                        <button
                          onClick={() => openConfirmModal(lease, payment)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors shadow-sm"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> Xác nhận thanh toán
                        </button>
                      ) : (
                        <span className="text-xs text-gray-400 font-medium">Đã hoàn tất</span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </>
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
                <label className="block text-xs font-semibold text-gray-700 mb-1">
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
                <label className="block text-xs font-semibold text-gray-700 mb-1">
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
                <label className="block text-xs font-semibold text-gray-700 mb-1">
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
